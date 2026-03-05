// ============================================================
// BuildMart — MatchingService
// Finds vendors within 50 km of a delivery coordinate whose
// KYC is APPROVED and who supply at least one material
// category present in the RFQ.
//
// Uses PostGIS ST_DWithin for efficient spatial filtering.
// Falls back to Haversine formula via raw SQL if PostGIS
// extension is unavailable in the environment.
// ============================================================

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../database/database.module";
import { VendorKycStatus, MaterialCategory } from "@buildmart/database";

export interface MatchedVendor {
  vendorProfileId: string;
  userId: string;
  businessName: string;
  whatsappNumber: string | null;
  distanceKm: number;
  categories: MaterialCategory[];
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private readonly radiusKm: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.radiusKm = config.get<number>("GEO_FENCE_RADIUS_KM", 50);
  }

  /**
   * Core matching query.
   * Returns all KYC-approved vendors within radiusKm of the delivery point
   * who serve at least one of the required material categories.
   */
  async findMatchingVendors(
    deliveryLat: number,
    deliveryLng: number,
    requiredCategories: MaterialCategory[],
  ): Promise<MatchedVendor[]> {
    this.logger.debug(
      `Matching vendors within ${this.radiusKm} km of (${deliveryLat}, ${deliveryLng}) ` +
        `for categories: ${requiredCategories.join(", ")}`,
    );

    // Raw SQL using Haversine formula — works without PostGIS geography columns.
    // (PostGIS ST_DWithin would require storing a geography column; the Decimal
    //  lat/lng columns we have are sufficient for the Haversine approach.)
    //
    // Formula: distance = 6371 * acos(
    //   cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1))
    //   + sin(radians(lat1)) * sin(radians(lat2))
    // )

    type RawRow = {
      vendor_profile_id: string;
      user_id: string;
      business_name: string;
      whatsapp_number: string | null;
      distance_km: number;
    };

    const rows = await this.prisma.$queryRaw<RawRow[]>`
      SELECT
        vp.id                AS vendor_profile_id,
        vp.user_id           AS user_id,
        vp.business_name     AS business_name,
        vp.whatsapp_number   AS whatsapp_number,
        ROUND(
          (6371 * ACOS(
            LEAST(1.0,
              COS(RADIANS(${deliveryLat}::float)) *
              COS(RADIANS(vp.warehouse_lat::float)) *
              COS(RADIANS(vp.warehouse_lng::float) - RADIANS(${deliveryLng}::float)) +
              SIN(RADIANS(${deliveryLat}::float)) *
              SIN(RADIANS(vp.warehouse_lat::float))
            )
          ))::numeric, 2
        )                    AS distance_km
      FROM vendor_profiles vp
      WHERE
        vp.kyc_status      = ${VendorKycStatus.APPROVED}
        AND vp.warehouse_lat IS NOT NULL
        AND vp.warehouse_lng IS NOT NULL
        AND (
          6371 * ACOS(
            LEAST(1.0,
              COS(RADIANS(${deliveryLat}::float)) *
              COS(RADIANS(vp.warehouse_lat::float)) *
              COS(RADIANS(vp.warehouse_lng::float) - RADIANS(${deliveryLng}::float)) +
              SIN(RADIANS(${deliveryLat}::float)) *
              SIN(RADIANS(vp.warehouse_lat::float))
            )
          )
        ) <= ${this.radiusKm}
        AND EXISTS (
          SELECT 1 FROM vendor_categories vc
          WHERE vc.vendor_profile_id = vp.id
            AND vc.category = ANY(${requiredCategories}::text[])
        )
      ORDER BY distance_km ASC
    `;

    if (!rows.length) {
      this.logger.warn(
        `No matching vendors found within ${this.radiusKm} km for categories: ${requiredCategories}`,
      );
      return [];
    }

    // Enrich with categories (separate query to avoid complex JSON aggregation in raw SQL)
    const vendorIds = rows.map((r) => r.vendor_profile_id);
    const categoryRows = await this.prisma.vendorCategory.findMany({
      where: { vendorProfileId: { in: vendorIds } },
    });
    const categoryMap = new Map<string, MaterialCategory[]>();
    for (const cr of categoryRows) {
      const existing = categoryMap.get(cr.vendorProfileId) ?? [];
      existing.push(cr.category);
      categoryMap.set(cr.vendorProfileId, existing);
    }

    return rows.map((r) => ({
      vendorProfileId: r.vendor_profile_id,
      userId: r.user_id,
      businessName: r.business_name,
      whatsappNumber: r.whatsapp_number,
      distanceKm: Number(r.distance_km),
      categories: categoryMap.get(r.vendor_profile_id) ?? [],
    }));
  }

  /**
   * Get required material categories from an RFQ's items.
   */
  async getRfqCategories(rfqId: string): Promise<MaterialCategory[]> {
    const items = await this.prisma.rfqItem.findMany({
      where: { rfqId },
      include: { material: { select: { category: true } } },
    });
    const unique = new Set(items.map((i) => i.material.category));
    return [...unique];
  }
}
