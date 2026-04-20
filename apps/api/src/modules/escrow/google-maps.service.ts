import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FuelStationBrand } from "@prisma/client";

type Coordinate = {
  latitude: number;
  longitude: number;
};

type PartyLocation = {
  city: string;
  province: string;
};

export type MeetingPlaceSuggestion = {
  brand: FuelStationBrand;
  stationName: string;
  address: string;
  city: string;
  province: string;
  source: "google_maps" | "fallback";
  latitude?: number;
  longitude?: number;
};

type GoogleTextSearchResponse = {
  places?: Array<{
    displayName?: {
      text?: string;
    };
    formattedAddress?: string;
    location?: Coordinate;
  }>;
};

type GoogleNearbySearchResponse = {
  places?: Array<{
    displayName?: {
      text?: string;
    };
    formattedAddress?: string;
    location?: Coordinate;
  }>;
};

@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);

  constructor(private readonly configService: ConfigService) {}

  async getFuelStationSuggestions(input: {
    buyer: PartyLocation;
    seller: PartyLocation;
  }): Promise<MeetingPlaceSuggestion[]> {
    const apiKey = this.configService.get<string>("GOOGLE_MAPS_API_KEY");

    if (!apiKey) {
      return this.getFallbackSuggestions(input);
    }

    try {
      const [buyerCoordinate, sellerCoordinate] = await Promise.all([
        this.searchLocation(input.buyer, apiKey),
        this.searchLocation(input.seller, apiKey)
      ]);

      if (!buyerCoordinate || !sellerCoordinate) {
        return this.getFallbackSuggestions(input);
      }

      const midpoint = {
        latitude: (buyerCoordinate.latitude + sellerCoordinate.latitude) / 2,
        longitude: (buyerCoordinate.longitude + sellerCoordinate.longitude) / 2
      };

      const nearbyPlaces = await this.searchNearbyFuelStations(midpoint, apiKey);
      const suggestions = nearbyPlaces
        .map((place) => this.toMeetingSuggestion(place, input))
        .filter((suggestion): suggestion is MeetingPlaceSuggestion => Boolean(suggestion))
        .slice(0, 6);

      return suggestions.length > 0 ? suggestions : this.getFallbackSuggestions(input);
    } catch (error) {
      this.logger.warn(
        `Google Maps suggestions failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return this.getFallbackSuggestions(input);
    }
  }

  private async searchLocation(
    location: PartyLocation,
    apiKey: string
  ): Promise<Coordinate | null> {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.location"
      },
      body: JSON.stringify({
        textQuery: `${location.city}, ${location.province}, Argentina`,
        languageCode: "es-AR",
        regionCode: "AR"
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as GoogleTextSearchResponse;
    return data.places?.[0]?.location ?? null;
  }

  private async searchNearbyFuelStations(
    coordinate: Coordinate,
    apiKey: string
  ) {
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location"
      },
      body: JSON.stringify({
        includedTypes: ["gas_station"],
        languageCode: "es-AR",
        regionCode: "AR",
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: coordinate,
            radius: 12000
          }
        }
      })
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as GoogleNearbySearchResponse;
    return data.places ?? [];
  }

  private toMeetingSuggestion(
    place: NonNullable<GoogleNearbySearchResponse["places"]>[number],
    input: { buyer: PartyLocation; seller: PartyLocation }
  ): MeetingPlaceSuggestion | null {
    const name = place.displayName?.text ?? "";
    const brand = this.detectBrand(name);

    if (!brand || !place.formattedAddress) {
      return null;
    }

    return {
      brand,
      stationName: name,
      address: place.formattedAddress,
      city:
        input.buyer.city === input.seller.city
          ? input.buyer.city
          : `${input.buyer.city} / ${input.seller.city}`,
      province:
        input.buyer.province === input.seller.province
          ? input.buyer.province
          : `${input.buyer.province} / ${input.seller.province}`,
      source: "google_maps",
      latitude: place.location?.latitude,
      longitude: place.location?.longitude
    };
  }

  private detectBrand(name: string): FuelStationBrand | null {
    const normalized = name.toUpperCase();

    if (normalized.includes("YPF")) {
      return FuelStationBrand.YPF;
    }

    if (normalized.includes("SHELL")) {
      return FuelStationBrand.SHELL;
    }

    if (normalized.includes("AXION")) {
      return FuelStationBrand.AXION;
    }

    return null;
  }

  private getFallbackSuggestions(input: {
    buyer: PartyLocation;
    seller: PartyLocation;
  }): MeetingPlaceSuggestion[] {
    const sharedCity =
      input.buyer.city === input.seller.city
        ? input.buyer.city
        : `${input.buyer.city} / ${input.seller.city}`;
    const sharedProvince =
      input.buyer.province === input.seller.province
        ? input.buyer.province
        : `${input.buyer.province} / ${input.seller.province}`;

    return [
      {
        brand: FuelStationBrand.YPF,
        stationName: "YPF Full sugerida",
        address: "Punto intermedio a confirmar con Google Maps",
        city: sharedCity,
        province: sharedProvince,
        source: "fallback"
      },
      {
        brand: FuelStationBrand.SHELL,
        stationName: "Shell Select sugerida",
        address: "Punto intermedio a confirmar con Google Maps",
        city: sharedCity,
        province: sharedProvince,
        source: "fallback"
      },
      {
        brand: FuelStationBrand.AXION,
        stationName: "Axion Spot sugerida",
        address: "Punto intermedio a confirmar con Google Maps",
        city: sharedCity,
        province: sharedProvince,
        source: "fallback"
      }
    ];
  }
}
