
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "agencies": {
                  Row: {
                    "cnpj": string,"created_at": string,"created_by": string,"creci": string,"id": string,"legal_name": string,"manager_email": string,"manager_name": string,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["agency_status"],"whatsapp": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cnpj": string,"created_at"?: string,"created_by": string,"creci": string,"id"?: string,"legal_name": string,"manager_email": string,"manager_name": string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["agency_status"],"whatsapp": string
                  }
                  Update: {
                    "cnpj"?: string,"created_at"?: string,"created_by"?: string,"creci"?: string,"id"?: string,"legal_name"?: string,"manager_email"?: string,"manager_name"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["agency_status"],"whatsapp"?: string
                  }
                  Relationships: [
                    
                  ]
                },"agency_invites": {
                  Row: {
                    "accepted_at": string | null,"agency_id": string,"created_at": string,"created_by": string,"email": string,"expires_at": string,"id": string,"role": Database["public"]['Enums']["member_role"],"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"agency_id": string,"created_at"?: string,"created_by": string,"email": string,"expires_at"?: string,"id"?: string,"role"?: Database["public"]['Enums']["member_role"],"token_hash": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"agency_id"?: string,"created_at"?: string,"created_by"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"role"?: Database["public"]['Enums']["member_role"],"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agency_invites_agency_id_fkey"
      columns: ["agency_id"]
isOneToOne: false
      referencedRelation: "agencies"
      referencedColumns: ["id"]
    }
                  ]
                },"agency_members": {
                  Row: {
                    "active": boolean,"agency_id": string,"created_at": string,"creci": string | null,"email": string,"in_rotation": boolean,"last_lead_at": string | null,"name": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"agency_id": string,"created_at"?: string,"creci"?: string | null,"email": string,"in_rotation"?: boolean,"last_lead_at"?: string | null,"name": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "active"?: boolean,"agency_id"?: string,"created_at"?: string,"creci"?: string | null,"email"?: string,"in_rotation"?: boolean,"last_lead_at"?: string | null,"name"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agency_members_agency_id_fkey"
      columns: ["agency_id"]
isOneToOne: false
      referencedRelation: "agencies"
      referencedColumns: ["id"]
    }
                  ]
                },"client_profiles": {
                  Row: {
                    "created_at": string,"name": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"name"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"name"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"consents": {
                  Row: {
                    "agency_id": string | null,"document_version": string | null,"granted_at": string,"id": string,"kind": Database["public"]['Enums']["consent_kind"],"revoked_at": string | null,"shared_snapshot": Json | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agency_id"?: string | null,"document_version"?: string | null,"granted_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["consent_kind"],"revoked_at"?: string | null,"shared_snapshot"?: Json | null,"user_id": string
                  }
                  Update: {
                    "agency_id"?: string | null,"document_version"?: string | null,"granted_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["consent_kind"],"revoked_at"?: string | null,"shared_snapshot"?: Json | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_agency_id_fkey"
      columns: ["agency_id"]
isOneToOne: false
      referencedRelation: "agencies"
      referencedColumns: ["id"]
    }
                  ]
                },"platform_admins": {
                  Row: {
                    "created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"properties": {
                  Row: {
                    "agency_id": string,"amenities": (string)[],"area_m2": number | null,"bathrooms": number | null,"bedrooms": number | null,"broker_id": string | null,"city": string,"complement": string | null,"condo_fee": number | null,"created_at": string,"description": string | null,"external_ref": string | null,"floor": number | null,"furnished": boolean | null,"has_seal": boolean,"id": string,"iptu_monthly": number | null,"lat": number | null,"lng": number | null,"neighborhood": string | null,"parking_spots": number | null,"pets": Database["public"]['Enums']["pets_policy"] | null,"pin_confirmed": boolean,"postal_code": string | null,"price": number | null,"published_at": string | null,"purpose": Database["public"]['Enums']["property_purpose"],"state": string,"status": Database["public"]['Enums']["property_status"],"street": string | null,"street_number": string | null,"suites": number | null,"title": string | null,"tour_url": string | null,"type": Database["public"]['Enums']["property_type"],"updated_at": string,"view": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "agency_id": string,"amenities"?: (string)[],"area_m2"?: number | null,"bathrooms"?: number | null,"bedrooms"?: number | null,"broker_id"?: string | null,"city"?: string,"complement"?: string | null,"condo_fee"?: number | null,"created_at"?: string,"description"?: string | null,"external_ref"?: string | null,"floor"?: number | null,"furnished"?: boolean | null,"has_seal"?: boolean,"id"?: string,"iptu_monthly"?: number | null,"lat"?: number | null,"lng"?: number | null,"neighborhood"?: string | null,"parking_spots"?: number | null,"pets"?: Database["public"]['Enums']["pets_policy"] | null,"pin_confirmed"?: boolean,"postal_code"?: string | null,"price"?: number | null,"published_at"?: string | null,"purpose"?: Database["public"]['Enums']["property_purpose"],"state"?: string,"status"?: Database["public"]['Enums']["property_status"],"street"?: string | null,"street_number"?: string | null,"suites"?: number | null,"title"?: string | null,"tour_url"?: string | null,"type"?: Database["public"]['Enums']["property_type"],"updated_at"?: string,"view"?: string | null
                  }
                  Update: {
                    "agency_id"?: string,"amenities"?: (string)[],"area_m2"?: number | null,"bathrooms"?: number | null,"bedrooms"?: number | null,"broker_id"?: string | null,"city"?: string,"complement"?: string | null,"condo_fee"?: number | null,"created_at"?: string,"description"?: string | null,"external_ref"?: string | null,"floor"?: number | null,"furnished"?: boolean | null,"has_seal"?: boolean,"id"?: string,"iptu_monthly"?: number | null,"lat"?: number | null,"lng"?: number | null,"neighborhood"?: string | null,"parking_spots"?: number | null,"pets"?: Database["public"]['Enums']["pets_policy"] | null,"pin_confirmed"?: boolean,"postal_code"?: string | null,"price"?: number | null,"published_at"?: string | null,"purpose"?: Database["public"]['Enums']["property_purpose"],"state"?: string,"status"?: Database["public"]['Enums']["property_status"],"street"?: string | null,"street_number"?: string | null,"suites"?: number | null,"title"?: string | null,"tour_url"?: string | null,"type"?: Database["public"]['Enums']["property_type"],"updated_at"?: string,"view"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "properties_agency_id_fkey"
      columns: ["agency_id"]
isOneToOne: false
      referencedRelation: "agencies"
      referencedColumns: ["id"]
    }
                  ]
                },"property_photos": {
                  Row: {
                    "alt_text": string | null,"created_at": string,"id": string,"is_cover": boolean,"position": number,"property_id": string,"source_url": string | null,"storage_path": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_text"?: string | null,"created_at"?: string,"id"?: string,"is_cover"?: boolean,"position"?: number,"property_id": string,"source_url"?: string | null,"storage_path"?: string | null
                  }
                  Update: {
                    "alt_text"?: string | null,"created_at"?: string,"id"?: string,"is_cover"?: boolean,"position"?: number,"property_id"?: string,"source_url"?: string | null,"storage_path"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "property_photos_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"seal_rules": {
                  Row: {
                    "id": number,"min_description_chars": number,"min_photos": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: number,"min_description_chars"?: number,"min_photos"?: number,"updated_at"?: string
                  }
                  Update: {
                    "id"?: number,"min_description_chars"?: number,"min_photos"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_agency_invite":
{ Args: { "p_creci": string,"p_name": string,"p_token": string }; Returns: string
                           },
"can_edit_property":
{ Args: { "p_id": string }; Returns: boolean
                           },
"compute_property_seal":
{ Args: { "p_id": string }; Returns: boolean
                           },
"create_agency_invite":
{ Args: { "p_agency": string,"p_email": string,"p_role": Database["public"]['Enums']["member_role"] }; Returns: string
                           },
"is_agency_approved":
{ Args: { "p_agency": string }; Returns: boolean
                           },
"is_agency_manager":
{ Args: { "p_agency": string }; Returns: boolean
                           },
"is_agency_member":
{ Args: { "p_agency": string }; Returns: boolean
                           },
"is_platform_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"property_public_info":
{ Args: { "p_id": string }; Returns: {
              "agency_creci": string,"agency_name": string,"broker_creci": string,"broker_name": string
            }[]
                           },
"register_agency":
{ Args: { "p_cnpj": string,"p_creci": string,"p_legal_name": string,"p_manager_name": string,"p_whatsapp": string }; Returns: string
                           },
"review_agency":
{ Args: { "p_agency": string,"p_status": Database["public"]['Enums']["agency_status"] }; Returns: undefined
                           }
          }
          Enums: {
            "agency_status": "pendente"|"aprovada"|"recusada"|"suspensa","consent_kind": "termos"|"compartilhamento"|"whatsapp","member_role": "gestor"|"corretor","pets_policy": "nao"|"pequeno"|"qualquer","property_purpose": "venda"|"aluguel","property_status": "rascunho"|"publicado"|"pausado"|"vendido"|"alugado","property_type": "apartamento"|"casa"|"cobertura"|"studio"|"sala_comercial"|"terreno"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "agency_status": ["pendente", "aprovada", "recusada", "suspensa"],"consent_kind": ["termos", "compartilhamento", "whatsapp"],"member_role": ["gestor", "corretor"],"pets_policy": ["nao", "pequeno", "qualquer"],"property_purpose": ["venda", "aluguel"],"property_status": ["rascunho", "publicado", "pausado", "vendido", "alugado"],"property_type": ["apartamento", "casa", "cobertura", "studio", "sala_comercial", "terreno"]
          }
        }
} as const
