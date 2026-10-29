
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
                    "cnpj": string | null,"created_at": string,"created_by": string,"creci": string,"id": string,"kind": Database["public"]['Enums']["advertiser_kind"],"legal_name": string,"manager_email": string,"manager_name": string,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["agency_status"],"verification": Json | null,"whatsapp": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cnpj"?: string | null,"created_at"?: string,"created_by": string,"creci": string,"id"?: string,"kind"?: Database["public"]['Enums']["advertiser_kind"],"legal_name": string,"manager_email": string,"manager_name": string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["agency_status"],"verification"?: Json | null,"whatsapp": string
                  }
                  Update: {
                    "cnpj"?: string | null,"created_at"?: string,"created_by"?: string,"creci"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["advertiser_kind"],"legal_name"?: string,"manager_email"?: string,"manager_name"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["agency_status"],"verification"?: Json | null,"whatsapp"?: string
                  }
                  Relationships: [
                    
                  ]
                },"agency_assistant_settings": {
                  Row: {
                    "agency_id": string,"distribution": Database["public"]['Enums']["distribution_mode"],"enabled": boolean,"farewell_message": string,"name": string,"questions": NonNullable<Json>,"updated_at": string,"updated_by": string | null,"welcome_message": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agency_id": string,"distribution"?: Database["public"]['Enums']["distribution_mode"],"enabled"?: boolean,"farewell_message": string,"name"?: string,"questions": NonNullable<Json>,"updated_at"?: string,"updated_by"?: string | null,"welcome_message": string
                  }
                  Update: {
                    "agency_id"?: string,"distribution"?: Database["public"]['Enums']["distribution_mode"],"enabled"?: boolean,"farewell_message"?: string,"name"?: string,"questions"?: NonNullable<Json>,"updated_at"?: string,"updated_by"?: string | null,"welcome_message"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agency_assistant_settings_agency_id_fkey"
      columns: ["agency_id"]
isOneToOne: true
      referencedRelation: "agencies"
      referencedColumns: ["id"]
    }
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
                },"ai_action_log": {
                  Row: {
                    "actor": string,"agency_id": string | null,"client_id": string | null,"created_at": string,"id": number,"input_tokens": number | null,"lead_id": string | null,"model": string | null,"output": Json | null,"output_tokens": number | null,"reached_client": boolean,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor": string,"agency_id"?: string | null,"client_id"?: string | null,"created_at"?: string,"id"?: never,"input_tokens"?: number | null,"lead_id"?: string | null,"model"?: string | null,"output"?: Json | null,"output_tokens"?: number | null,"reached_client"?: boolean,"status": string
                  }
                  Update: {
                    "actor"?: string,"agency_id"?: string | null,"client_id"?: string | null,"created_at"?: string,"id"?: never,"input_tokens"?: number | null,"lead_id"?: string | null,"model"?: string | null,"output"?: Json | null,"output_tokens"?: number | null,"reached_client"?: boolean,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_action_log_agency_id_fkey"
      columns: ["agency_id"]
isOneToOne: false
      referencedRelation: "agencies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_action_log_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_suggestions": {
                  Row: {
                    "body": string,"created_at": string,"decided_at": string | null,"decided_by": string | null,"final_body": string | null,"id": string,"lead_id": string,"status": Database["public"]['Enums']["suggestion_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"final_body"?: string | null,"id"?: string,"lead_id": string,"status"?: Database["public"]['Enums']["suggestion_status"]
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"final_body"?: string | null,"id"?: string,"lead_id"?: string,"status"?: Database["public"]['Enums']["suggestion_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_suggestions_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    }
                  ]
                },"client_profiles": {
                  Row: {
                    "bedrooms_min": number | null,"budget_max": number | null,"budget_min": number | null,"commute_max_min": number | null,"created_at": string,"extras": (string)[],"goal": Database["public"]['Enums']["client_goal"] | null,"has_children": boolean | null,"lifestyle": Database["public"]['Enums']["client_lifestyle"] | null,"name": string | null,"neighborhoods": (string)[],"parking_min": number | null,"pets": Database["public"]['Enums']["client_pets"] | null,"priorities": (string)[],"property_kind": Database["public"]['Enums']["client_property_kind"] | null,"purpose": Database["public"]['Enums']["client_purpose"] | null,"timeline": Database["public"]['Enums']["client_timeline"] | null,"updated_at": string,"user_id": string,"work_neighborhood": string | null,"works_from_home": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bedrooms_min"?: number | null,"budget_max"?: number | null,"budget_min"?: number | null,"commute_max_min"?: number | null,"created_at"?: string,"extras"?: (string)[],"goal"?: Database["public"]['Enums']["client_goal"] | null,"has_children"?: boolean | null,"lifestyle"?: Database["public"]['Enums']["client_lifestyle"] | null,"name"?: string | null,"neighborhoods"?: (string)[],"parking_min"?: number | null,"pets"?: Database["public"]['Enums']["client_pets"] | null,"priorities"?: (string)[],"property_kind"?: Database["public"]['Enums']["client_property_kind"] | null,"purpose"?: Database["public"]['Enums']["client_purpose"] | null,"timeline"?: Database["public"]['Enums']["client_timeline"] | null,"updated_at"?: string,"user_id": string,"work_neighborhood"?: string | null,"works_from_home"?: boolean | null
                  }
                  Update: {
                    "bedrooms_min"?: number | null,"budget_max"?: number | null,"budget_min"?: number | null,"commute_max_min"?: number | null,"created_at"?: string,"extras"?: (string)[],"goal"?: Database["public"]['Enums']["client_goal"] | null,"has_children"?: boolean | null,"lifestyle"?: Database["public"]['Enums']["client_lifestyle"] | null,"name"?: string | null,"neighborhoods"?: (string)[],"parking_min"?: number | null,"pets"?: Database["public"]['Enums']["client_pets"] | null,"priorities"?: (string)[],"property_kind"?: Database["public"]['Enums']["client_property_kind"] | null,"purpose"?: Database["public"]['Enums']["client_purpose"] | null,"timeline"?: Database["public"]['Enums']["client_timeline"] | null,"updated_at"?: string,"user_id"?: string,"work_neighborhood"?: string | null,"works_from_home"?: boolean | null
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
                },"favorites": {
                  Row: {
                    "created_at": string,"property_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"property_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"property_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorites_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"internal_notes": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"id": string,"lead_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string,"body": string,"created_at"?: string,"id"?: string,"lead_id": string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"id"?: string,"lead_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "internal_notes_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    }
                  ]
                },"lead_messages": {
                  Row: {
                    "author_id": string | null,"body": string,"created_at": string,"id": number,"lead_id": string,"meta": Json | null,"quick_replies": (string)[],"sender": Database["public"]['Enums']["message_sender"]
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body": string,"created_at"?: string,"id"?: never,"lead_id": string,"meta"?: Json | null,"quick_replies"?: (string)[],"sender": Database["public"]['Enums']["message_sender"]
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: never,"lead_id"?: string,"meta"?: Json | null,"quick_replies"?: (string)[],"sender"?: Database["public"]['Enums']["message_sender"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "lead_messages_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    }
                  ]
                },"lead_questions": {
                  Row: {
                    "answered_at": string | null,"body": string,"created_at": string,"id": string,"lead_id": string,"status": Database["public"]['Enums']["question_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "answered_at"?: string | null,"body": string,"created_at"?: string,"id"?: string,"lead_id": string,"status"?: Database["public"]['Enums']["question_status"]
                  }
                  Update: {
                    "answered_at"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"lead_id"?: string,"status"?: Database["public"]['Enums']["question_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "lead_questions_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    }
                  ]
                },"lead_stage_events": {
                  Row: {
                    "at": string,"id": number,"lead_id": string,"stage": Database["public"]['Enums']["lead_stage"]
                  }
                  ComputedFields: never
                  Insert: {
                    "at"?: string,"id"?: never,"lead_id": string,"stage": Database["public"]['Enums']["lead_stage"]
                  }
                  Update: {
                    "at"?: string,"id"?: never,"lead_id"?: string,"stage"?: Database["public"]['Enums']["lead_stage"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "lead_stage_events_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    }
                  ]
                },"leads": {
                  Row: {
                    "agency_id": string,"ai_summary": string | null,"assistant_active": boolean,"assistant_finished_at": string | null,"assistant_queue": (string)[],"broker_id": string | null,"client_id": string | null,"client_name": string,"consent_id": string | null,"consent_revoked_at": string | null,"created_at": string,"custom_answers": NonNullable<Json>,"first_human_response_at": string | null,"id": string,"interest_property_ids": (string)[],"last_message_at": string,"lost_note": string | null,"lost_reason": Database["public"]['Enums']["lost_reason"] | null,"origin_property_id": string | null,"profile_snapshot": NonNullable<Json>,"qualification": NonNullable<Json>,"stage": Database["public"]['Enums']["lead_stage"],"stage_changed_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agency_id": string,"ai_summary"?: string | null,"assistant_active"?: boolean,"assistant_finished_at"?: string | null,"assistant_queue"?: (string)[],"broker_id"?: string | null,"client_id"?: string | null,"client_name": string,"consent_id"?: string | null,"consent_revoked_at"?: string | null,"created_at"?: string,"custom_answers"?: NonNullable<Json>,"first_human_response_at"?: string | null,"id"?: string,"interest_property_ids"?: (string)[],"last_message_at"?: string,"lost_note"?: string | null,"lost_reason"?: Database["public"]['Enums']["lost_reason"] | null,"origin_property_id"?: string | null,"profile_snapshot": NonNullable<Json>,"qualification"?: NonNullable<Json>,"stage"?: Database["public"]['Enums']["lead_stage"],"stage_changed_at"?: string
                  }
                  Update: {
                    "agency_id"?: string,"ai_summary"?: string | null,"assistant_active"?: boolean,"assistant_finished_at"?: string | null,"assistant_queue"?: (string)[],"broker_id"?: string | null,"client_id"?: string | null,"client_name"?: string,"consent_id"?: string | null,"consent_revoked_at"?: string | null,"created_at"?: string,"custom_answers"?: NonNullable<Json>,"first_human_response_at"?: string | null,"id"?: string,"interest_property_ids"?: (string)[],"last_message_at"?: string,"lost_note"?: string | null,"lost_reason"?: Database["public"]['Enums']["lost_reason"] | null,"origin_property_id"?: string | null,"profile_snapshot"?: NonNullable<Json>,"qualification"?: NonNullable<Json>,"stage"?: Database["public"]['Enums']["lead_stage"],"stage_changed_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "leads_agency_id_fkey"
      columns: ["agency_id"]
isOneToOne: false
      referencedRelation: "agencies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_consent_id_fkey"
      columns: ["consent_id"]
isOneToOne: false
      referencedRelation: "consents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_origin_property_id_fkey"
      columns: ["origin_property_id"]
isOneToOne: false
      referencedRelation: "properties"
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
                },"platform_settings": {
                  Row: {
                    "ai_daily_limit": number,"alert_min_score": number,"id": number,"score_weights": NonNullable<Json>,"score_weights_version": number,"seal_rank_bonus": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_daily_limit"?: number,"alert_min_score"?: number,"id"?: number,"score_weights"?: NonNullable<Json>,"score_weights_version"?: number,"seal_rank_bonus"?: number,"updated_at"?: string
                  }
                  Update: {
                    "ai_daily_limit"?: number,"alert_min_score"?: number,"id"?: number,"score_weights"?: NonNullable<Json>,"score_weights_version"?: number,"seal_rank_bonus"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profile_chat_messages": {
                  Row: {
                    "author": Database["public"]['Enums']["chat_author"],"body": string,"cards": Json | null,"created_at": string,"id": number,"quick_replies": (string)[],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author": Database["public"]['Enums']["chat_author"],"body": string,"cards"?: Json | null,"created_at"?: string,"id"?: never,"quick_replies"?: (string)[],"user_id": string
                  }
                  Update: {
                    "author"?: Database["public"]['Enums']["chat_author"],"body"?: string,"cards"?: Json | null,"created_at"?: string,"id"?: never,"quick_replies"?: (string)[],"user_id"?: string
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
                },"property_views": {
                  Row: {
                    "first_viewed_at": string,"last_viewed_at": string,"property_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "first_viewed_at"?: string,"last_viewed_at"?: string,"property_id": string,"user_id": string
                  }
                  Update: {
                    "first_viewed_at"?: string,"last_viewed_at"?: string,"property_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "property_views_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
                  ]
                },"proposals": {
                  Row: {
                    "agency_id": string,"amount": number,"answered_at": string | null,"counter_amount": number | null,"created_at": string,"created_by": string | null,"forwarded_at": string | null,"id": string,"lead_id": string,"made_by": Database["public"]['Enums']["message_sender"],"payment_note": string | null,"property_id": string | null,"status": Database["public"]['Enums']["proposal_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "agency_id": string,"amount": number,"answered_at"?: string | null,"counter_amount"?: number | null,"created_at"?: string,"created_by"?: string | null,"forwarded_at"?: string | null,"id"?: string,"lead_id": string,"made_by": Database["public"]['Enums']["message_sender"],"payment_note"?: string | null,"property_id"?: string | null,"status"?: Database["public"]['Enums']["proposal_status"]
                  }
                  Update: {
                    "agency_id"?: string,"amount"?: number,"answered_at"?: string | null,"counter_amount"?: number | null,"created_at"?: string,"created_by"?: string | null,"forwarded_at"?: string | null,"id"?: string,"lead_id"?: string,"made_by"?: Database["public"]['Enums']["message_sender"],"payment_note"?: string | null,"property_id"?: string | null,"status"?: Database["public"]['Enums']["proposal_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "proposals_agency_id_fkey"
      columns: ["agency_id"]
isOneToOne: false
      referencedRelation: "agencies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proposals_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proposals_property_id_fkey"
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
                },"visits": {
                  Row: {
                    "agency_id": string,"broker_id": string | null,"confirmed_at": string | null,"confirmed_by": string | null,"created_at": string,"duration_min": number,"id": string,"lead_id": string,"note": string | null,"property_id": string | null,"requested_by": Database["public"]['Enums']["message_sender"],"starts_at": string,"status": Database["public"]['Enums']["visit_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agency_id": string,"broker_id"?: string | null,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"duration_min"?: number,"id"?: string,"lead_id": string,"note"?: string | null,"property_id"?: string | null,"requested_by": Database["public"]['Enums']["message_sender"],"starts_at": string,"status"?: Database["public"]['Enums']["visit_status"],"updated_at"?: string
                  }
                  Update: {
                    "agency_id"?: string,"broker_id"?: string | null,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"duration_min"?: number,"id"?: string,"lead_id"?: string,"note"?: string | null,"property_id"?: string | null,"requested_by"?: Database["public"]['Enums']["message_sender"],"starts_at"?: string,"status"?: Database["public"]['Enums']["visit_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "visits_agency_id_fkey"
      columns: ["agency_id"]
isOneToOne: false
      referencedRelation: "agencies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visits_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "visits_property_id_fkey"
      columns: ["property_id"]
isOneToOne: false
      referencedRelation: "properties"
      referencedColumns: ["id"]
    }
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
"advance_lead_stage":
{ Args: { "p_lead": string,"p_stage": Database["public"]['Enums']["lead_stage"] }; Returns: undefined
                           },
"agency_can_draft":
{ Args: { "p_agency": string }; Returns: boolean
                           },
"agency_is_autonomous":
{ Args: { "p_agency": string }; Returns: boolean
                           },
"agency_property_stats":
{ Args: { "p_agency": string,"p_from": string,"p_to": string }; Returns: {
              "property_id": string,"saves": number,"views": number
            }[]
                           },
"agency_team":
{ Args: { "p_agency": string }; Returns: {
              "active": boolean,"in_rotation": boolean,"name": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
            }[]
                           },
"answer_proposal":
{ Args: { "p_counter"?: number,"p_proposal": string,"p_status": Database["public"]['Enums']["proposal_status"] }; Returns: undefined
                           },
"build_profile_snapshot":
{ Args: { "p_user": string }; Returns: Json
                           },
"can_edit_property":
{ Args: { "p_id": string }; Returns: boolean
                           },
"close_visit":
{ Args: { "p_note"?: string,"p_status": Database["public"]['Enums']["visit_status"],"p_visit": string }; Returns: undefined
                           },
"compute_property_seal":
{ Args: { "p_id": string }; Returns: boolean
                           },
"confirm_visit":
{ Args: { "p_visit": string }; Returns: undefined
                           },
"create_agency_invite":
{ Args: { "p_agency": string,"p_email": string,"p_role": Database["public"]['Enums']["member_role"] }; Returns: string
                           },
"default_assistant_questions":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"fmt_brl":
{ Args: { "p_value": number }; Returns: string
                           },
"fmt_when":
{ Args: { "p_at": string }; Returns: string
                           },
"forward_proposal":
{ Args: { "p_proposal": string }; Returns: undefined
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
"is_lead_client":
{ Args: { "p_lead": string }; Returns: boolean
                           },
"is_lead_open":
{ Args: { "p_lead": string }; Returns: boolean
                           },
"is_lead_staff":
{ Args: { "p_lead": string }; Returns: boolean
                           },
"is_platform_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"lead_property_activity":
{ Args: { "p_lead": string }; Returns: {
              "property_id": string,"saved": boolean,"viewed_at": string
            }[]
                           },
"lead_system_message":
{ Args: { "p_body": string,"p_lead": string }; Returns: undefined
                           },
"make_proposal":
{ Args: { "p_amount": number,"p_lead": string,"p_note"?: string,"p_property": string }; Returns: string
                           },
"mark_property_viewed":
{ Args: { "p_property": string }; Returns: undefined
                           },
"my_conversations":
{ Args: Record<PropertyKey, never>; Returns: {
              "agency_id": string,"agency_name": string,"assistant_active": boolean,"assistant_name": string,"broker_creci": string,"broker_name": string,"broker_replied": boolean,"last_body": string,"last_message_at": string,"last_sender": Database["public"]['Enums']["message_sender"],"lead_id": string,"origin_property_id": string,"origin_property_title": string,"revoked": boolean,"shared_at": string
            }[]
                           },
"my_saved_properties":
{ Args: Record<PropertyKey, never>; Returns: {
              "available": boolean,"neighborhood": string,"price": number,"property_id": string,"saved_at": string,"title": string,"type": Database["public"]['Enums']["property_type"]
            }[]
                           },
"pick_broker":
{ Args: { "p_agency": string }; Returns: string
                           },
"property_public_info":
{ Args: { "p_id": string }; Returns: {
              "agency_creci": string,"agency_kind": Database["public"]['Enums']["advertiser_kind"],"agency_name": string,"broker_creci": string,"broker_name": string
            }[]
                           },
"register_agency":
{ Args: { "p_cnpj": string,"p_creci": string,"p_legal_name": string,"p_manager_name": string,"p_whatsapp": string }; Returns: string
                           },
"register_autonomous":
{ Args: { "p_creci": string,"p_name": string,"p_whatsapp": string }; Returns: string
                           },
"request_visit":
{ Args: { "p_message": number,"p_slot": number }; Returns: string
                           },
"reschedule_visit":
{ Args: { "p_at": string,"p_visit": string }; Returns: undefined
                           },
"review_agency":
{ Args: { "p_agency": string,"p_status": Database["public"]['Enums']["agency_status"] }; Returns: undefined
                           },
"revoke_share":
{ Args: { "p_agency": string }; Returns: undefined
                           },
"schedule_visit":
{ Args: { "p_at": string,"p_lead": string,"p_property": string }; Returns: string
                           },
"share_profile":
{ Args: { "p_property": string }; Returns: string
                           },
"suggest_visit_slots":
{ Args: { "p_lead": string,"p_property": string,"p_slots": (string)[] }; Returns: number
                           }
          }
          Enums: {
            "advertiser_kind": "imobiliaria"|"autonomo","agency_status": "pendente"|"aprovada"|"recusada"|"suspensa","chat_author": "cliente"|"ia"|"sistema","client_goal": "morar"|"investir"|"ambos","client_lifestyle": "tranquilidade"|"meio_termo"|"movimento","client_pets": "nenhum"|"pequeno"|"grande","client_property_kind": "apartamento"|"casa"|"tanto_faz","client_purpose": "comprar"|"alugar","client_timeline": "ate_3_meses"|"ate_6_meses"|"pesquisando","consent_kind": "termos"|"compartilhamento"|"whatsapp","distribution_mode": "rodizio"|"manual","lead_stage": "novo"|"em_atendimento"|"qualificado"|"visita_agendada"|"proposta"|"negociacao"|"fechado"|"perdido","lost_reason": "preco"|"localizacao"|"desistiu"|"comprou_com_outro"|"sem_resposta"|"outro","member_role": "gestor"|"corretor","message_sender": "cliente"|"corretor"|"assistente"|"sistema","pets_policy": "nao"|"pequeno"|"qualquer","property_purpose": "venda"|"aluguel","property_status": "rascunho"|"publicado"|"pausado"|"vendido"|"alugado","property_type": "apartamento"|"casa"|"cobertura"|"studio"|"sala_comercial"|"terreno","proposal_status": "recebida"|"encaminhada"|"aceita"|"recusada"|"contraproposta","question_status": "encaminhada"|"respondida","suggestion_status": "pendente"|"aprovada"|"editada"|"descartada","visit_status": "pedida"|"confirmada"|"realizada"|"nao_compareceu"|"cancelada"
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
            "advertiser_kind": ["imobiliaria", "autonomo"],"agency_status": ["pendente", "aprovada", "recusada", "suspensa"],"chat_author": ["cliente", "ia", "sistema"],"client_goal": ["morar", "investir", "ambos"],"client_lifestyle": ["tranquilidade", "meio_termo", "movimento"],"client_pets": ["nenhum", "pequeno", "grande"],"client_property_kind": ["apartamento", "casa", "tanto_faz"],"client_purpose": ["comprar", "alugar"],"client_timeline": ["ate_3_meses", "ate_6_meses", "pesquisando"],"consent_kind": ["termos", "compartilhamento", "whatsapp"],"distribution_mode": ["rodizio", "manual"],"lead_stage": ["novo", "em_atendimento", "qualificado", "visita_agendada", "proposta", "negociacao", "fechado", "perdido"],"lost_reason": ["preco", "localizacao", "desistiu", "comprou_com_outro", "sem_resposta", "outro"],"member_role": ["gestor", "corretor"],"message_sender": ["cliente", "corretor", "assistente", "sistema"],"pets_policy": ["nao", "pequeno", "qualquer"],"property_purpose": ["venda", "aluguel"],"property_status": ["rascunho", "publicado", "pausado", "vendido", "alugado"],"property_type": ["apartamento", "casa", "cobertura", "studio", "sala_comercial", "terreno"],"proposal_status": ["recebida", "encaminhada", "aceita", "recusada", "contraproposta"],"question_status": ["encaminhada", "respondida"],"suggestion_status": ["pendente", "aprovada", "editada", "descartada"],"visit_status": ["pedida", "confirmada", "realizada", "nao_compareceu", "cancelada"]
          }
        }
} as const
