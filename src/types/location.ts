// Mirrors the locations table (see docs/product-spec.md section 5).
export type Location = {
  id: string;
  slug: "leiligheten" | "hytta";
  displayName: string;
  address: string;
  latitude: number;
  longitude: number;
  elevationMeters: number;
  timezone: string;
  isActive: boolean;
};
