export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      handover_protocols: {
        Row: {
          id: string;
          reservation_id: string | null;
          car_id: string | null;
          type: "handover" | "return";
          handover_protocol_id: string | null;
          customer_first_name: string;
          customer_last_name: string;
          customer_email: string;
          customer_phone: string | null;
          customer_id_card_front_url: string | null;
          customer_id_card_back_url: string | null;
          customer_driver_license_url: string | null;
          car_name: string;
          car_license_plate: string;
          reservation_number: string | null;
          protocol_datetime: string;
          expected_return_datetime: string | null;
          location: string | null;
          mileage_km: number | null;
          mileage_photo_url: string | null;
          fuel_level: "1/4" | "2/4" | "3/4" | "4/4" | null;
          fuel_photo_url: string | null;
          allowed_km: number | null;
          km_exceeded: number | null;
          km_exceeded_price: number | null;
          extra_km_rate: number | null;
          deposit_amount: number | null;
          deposit_method: "cash" | "bank_transfer" | "card_hold" | null;
          car_photos: string[];
          damages: Json;
          signature_landlord_url: string | null;
          signature_tenant_url: string | null;
          internal_notes: string | null;
          pdf_url: string | null;
          access_code: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          status: "draft" | "completed";
        };
        Insert: {
          id?: string;
          reservation_id?: string | null;
          car_id?: string | null;
          type: "handover" | "return";
          handover_protocol_id?: string | null;
          customer_first_name: string;
          customer_last_name: string;
          customer_email: string;
          customer_phone?: string | null;
          customer_id_card_front_url?: string | null;
          customer_id_card_back_url?: string | null;
          customer_driver_license_url?: string | null;
          car_name: string;
          car_license_plate: string;
          reservation_number?: string | null;
          protocol_datetime?: string;
          expected_return_datetime?: string | null;
          location?: string | null;
          mileage_km?: number | null;
          mileage_photo_url?: string | null;
          fuel_level?: "1/4" | "2/4" | "3/4" | "4/4" | null;
          fuel_photo_url?: string | null;
          allowed_km?: number | null;
          km_exceeded?: number | null;
          km_exceeded_price?: number | null;
          extra_km_rate?: number | null;
          deposit_amount?: number | null;
          deposit_method?: "cash" | "bank_transfer" | "card_hold" | null;
          car_photos?: string[];
          damages?: Json;
          signature_landlord_url?: string | null;
          signature_tenant_url?: string | null;
          internal_notes?: string | null;
          pdf_url?: string | null;
          access_code?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          status?: "draft" | "completed";
        };
        Update: {
          id?: string;
          reservation_id?: string | null;
          car_id?: string | null;
          type?: "handover" | "return";
          handover_protocol_id?: string | null;
          customer_first_name?: string;
          customer_last_name?: string;
          customer_email?: string;
          customer_phone?: string | null;
          customer_id_card_front_url?: string | null;
          customer_id_card_back_url?: string | null;
          customer_driver_license_url?: string | null;
          car_name?: string;
          car_license_plate?: string;
          reservation_number?: string | null;
          protocol_datetime?: string;
          expected_return_datetime?: string | null;
          location?: string | null;
          mileage_km?: number | null;
          mileage_photo_url?: string | null;
          fuel_level?: "1/4" | "2/4" | "3/4" | "4/4" | null;
          fuel_photo_url?: string | null;
          allowed_km?: number | null;
          km_exceeded?: number | null;
          km_exceeded_price?: number | null;
          extra_km_rate?: number | null;
          deposit_amount?: number | null;
          deposit_method?: "cash" | "bank_transfer" | "card_hold" | null;
          car_photos?: string[];
          damages?: Json;
          signature_landlord_url?: string | null;
          signature_tenant_url?: string | null;
          internal_notes?: string | null;
          pdf_url?: string | null;
          access_code?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          status?: "draft" | "completed";
        };
        Relationships: [
          {
            foreignKeyName: "handover_protocols_car_id_fkey";
            columns: ["car_id"];
            isOneToOne: false;
            referencedRelation: "cars";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "handover_protocols_reservation_id_fkey";
            columns: ["reservation_id"];
            isOneToOne: false;
            referencedRelation: "reservations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "handover_protocols_handover_protocol_id_fkey";
            columns: ["handover_protocol_id"];
            isOneToOne: false;
            referencedRelation: "handover_protocols";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "handover_protocols_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          is_admin: boolean;
          [key: string]: Json | undefined;
        };
        Insert: {
          id: string;
          is_admin?: boolean;
          [key: string]: Json | undefined;
        };
        Update: {
          id?: string;
          is_admin?: boolean;
          [key: string]: Json | undefined;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          id: string;
          reservation_number: string | null;
          [key: string]: Json | undefined;
        };
        Insert: {
          [key: string]: Json | undefined;
        };
        Update: {
          [key: string]: Json | undefined;
        };
        Relationships: [];
      };
      cars: {
        Row: {
          id: string;
          name: string;
          extra_km_price: number | null;
          [key: string]: Json | undefined;
        };
        Insert: {
          [key: string]: Json | undefined;
        };
        Update: {
          [key: string]: Json | undefined;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          [key: string]: Json | undefined;
        };
        Insert: {
          [key: string]: Json | undefined;
        };
        Update: {
          [key: string]: Json | undefined;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          id: string;
          [key: string]: Json | undefined;
        };
        Insert: {
          [key: string]: Json | undefined;
        };
        Update: {
          [key: string]: Json | undefined;
        };
        Relationships: [];
      };
      pickup_locations: {
        Row: {
          id: string;
          [key: string]: Json | undefined;
        };
        Insert: {
          [key: string]: Json | undefined;
        };
        Update: {
          [key: string]: Json | undefined;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
