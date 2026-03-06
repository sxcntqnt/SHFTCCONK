export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_denied_log: {
        Row: {
          action_attempted: string
          actor_id: string | null
          created_at: string | null
          denial_reason: string
          id: string
          profile_id: string | null
          resource_branch: string | null
          resource_dept: string | null
          resource_org: string | null
          resource_type: string | null
        }
        Insert: {
          action_attempted: string
          actor_id?: string | null
          created_at?: string | null
          denial_reason: string
          id?: string
          profile_id?: string | null
          resource_branch?: string | null
          resource_dept?: string | null
          resource_org?: string | null
          resource_type?: string | null
        }
        Update: {
          action_attempted?: string
          actor_id?: string | null
          created_at?: string | null
          denial_reason?: string
          id?: string
          profile_id?: string | null
          resource_branch?: string | null
          resource_dept?: string | null
          resource_org?: string | null
          resource_type?: string | null
        }
        Relationships: []
      }
      actor_jurisdictions: {
        Row: {
          actor_id: string
          created_at: string | null
          id: string
          level: string
          scope_id: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string | null
          id?: string
          level: string
          scope_id?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string | null
          id?: string
          level?: string
          scope_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actor_jurisdictions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      actor_permissions: {
        Row: {
          actor_id: string
          created_at: string | null
          effect: string | null
          expires_at: string | null
          id: string
          level: string
          permission_id: string
          scope_id: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string | null
          effect?: string | null
          expires_at?: string | null
          id?: string
          level: string
          permission_id: string
          scope_id?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string | null
          effect?: string | null
          expires_at?: string | null
          id?: string
          level?: string
          permission_id?: string
          scope_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actor_permissions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actor_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      actor_policy_groups: {
        Row: {
          actor_id: string
          created_at: string | null
          group_id: string
          id: string
          level: string
          scope_id: string | null
        }
        Insert: {
          actor_id: string
          created_at?: string | null
          group_id: string
          id?: string
          level: string
          scope_id?: string | null
        }
        Update: {
          actor_id?: string
          created_at?: string | null
          group_id?: string
          id?: string
          level?: string
          scope_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actor_policy_groups_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actor_policy_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "policy_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      actor_requests: {
        Row: {
          created_at: string | null
          id: string
          payload: Json | null
          processed_at: string | null
          processed_by: string | null
          profile_id: string
          requested_type: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          profile_id: string
          requested_type: string
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          profile_id?: string
          requested_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "actor_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actor_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actor_requests_requested_type_fkey"
            columns: ["requested_type"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      actors: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          profile_id: string
          status: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          profile_id: string
          status?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          profile_id?: string
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "actors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actors_type_fkey"
            columns: ["type"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          actor_id: string | null
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          performed_by: string | null
          profile_id: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          performed_by?: string | null
          profile_id?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          performed_by?: string | null
          profile_id?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          branch_id: string | null
          created_at: string | null
          department_id: string | null
          fare: number | null
          id: string
          metadata: Json | null
          organization_id: string | null
          passenger_actor_id: string | null
          route_from: string | null
          route_to: string | null
          status: string | null
          vehicle_id: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string | null
          department_id?: string | null
          fare?: number | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          passenger_actor_id?: string | null
          route_from?: string | null
          route_to?: string | null
          status?: string | null
          vehicle_id?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string | null
          department_id?: string | null
          fare?: number | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          passenger_actor_id?: string | null
          route_from?: string | null
          route_to?: string | null
          status?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_passenger_actor_id_fkey"
            columns: ["passenger_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_events: {
        Row: {
          created_at: string | null
          driver_id: string | null
          id: string
          message: string | null
          metadata: Json | null
          organization_id: string
          resolved: boolean | null
          severity: string
          type: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          driver_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          organization_id: string
          resolved?: boolean | null
          severity: string
          type: string
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          driver_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          organization_id?: string
          resolved?: boolean | null
          severity?: string
          type?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      conductor_assignments: {
        Row: {
          active_trip_id: string | null
          actor_id: string
          assigned_at: string | null
          vehicle_id: string
        }
        Insert: {
          active_trip_id?: string | null
          actor_id: string
          assigned_at?: string | null
          vehicle_id: string
        }
        Update: {
          active_trip_id?: string | null
          actor_id?: string
          assigned_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conductor_assignments_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: true
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conductor_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_requests: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          message_body: string | null
          phone: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          message_body?: string | null
          phone?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          message_body?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      delegated_authority: {
        Row: {
          created_at: string | null
          expires_at: string
          from_actor_id: string
          id: string
          level: string
          permission_id: string
          reason: string | null
          revoked: boolean | null
          scope_id: string | null
          to_actor_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          from_actor_id: string
          id?: string
          level: string
          permission_id: string
          reason?: string | null
          revoked?: boolean | null
          scope_id?: string | null
          to_actor_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          from_actor_id?: string
          id?: string
          level?: string
          permission_id?: string
          reason?: string | null
          revoked?: boolean | null
          scope_id?: string | null
          to_actor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegated_authority_from_actor_id_fkey"
            columns: ["from_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegated_authority_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegated_authority_to_actor_id_fkey"
            columns: ["to_actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_assignments: {
        Row: {
          active_trip_id: string | null
          actor_id: string
          assigned_at: string | null
          shift_state: string | null
          vehicle_id: string
        }
        Insert: {
          active_trip_id?: string | null
          actor_id: string
          assigned_at?: string | null
          shift_state?: string | null
          vehicle_id: string
        }
        Update: {
          active_trip_id?: string | null
          actor_id?: string
          assigned_at?: string | null
          shift_state?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_assignments_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: true
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_ownership: {
        Row: {
          actor_id: string
          percentage: number | null
          vehicle_id: string
        }
        Insert: {
          actor_id: string
          percentage?: number | null
          vehicle_id: string
        }
        Update: {
          actor_id?: string
          percentage?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_ownership_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_ownership_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_tokens: {
        Row: {
          actor_type: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string
          metadata: Json | null
          organization_id: string | null
          token: string
          used: boolean | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          actor_type?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          metadata?: Json | null
          organization_id?: string | null
          token?: string
          used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          actor_type?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          metadata?: Json | null
          organization_id?: string | null
          token?: string
          used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_tokens_actor_type_fkey"
            columns: ["actor_type"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_tokens_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          actor_id: string
          organization_id: string
          role: string
        }
        Insert: {
          actor_id: string
          organization_id: string
          role?: string
        }
        Update: {
          actor_id?: string
          organization_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          federal_only: boolean | null
          id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          federal_only?: boolean | null
          id?: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          federal_only?: boolean | null
          id?: string
        }
        Relationships: []
      }
      policy_group_permissions: {
        Row: {
          effect: string | null
          group_id: string
          id: string
          permission_id: string
        }
        Insert: {
          effect?: string | null
          group_id: string
          id?: string
          permission_id: string
        }
        Update: {
          effect?: string | null
          group_id?: string
          id?: string
          permission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_group_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "policy_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_group_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string | null
          full_name: string | null
          id: string
          permissions_version: number
          unsubscribed: boolean
          updated_at: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          permissions_version?: number
          unsubscribed?: boolean
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          permissions_version?: number
          unsubscribed?: boolean
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      reconciliation_events: {
        Row: {
          created_at: string | null
          expected_amount: number | null
          id: string
          organization_id: string
          status: string | null
          total_collected: number | null
          variance: number | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          expected_amount?: number | null
          id?: string
          organization_id: string
          status?: string | null
          total_collected?: number | null
          variance?: number | null
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          expected_amount?: number | null
          id?: string
          organization_id?: string
          status?: string | null
          total_collected?: number | null
          variance?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      stage_assignments: {
        Row: {
          created_at: string | null
          id: string
          operator_id: string
          organization_id: string | null
          route: Json | null
          stage_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          operator_id: string
          organization_id?: string | null
          route?: Json | null
          stage_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          operator_id?: string
          organization_id?: string | null
          route?: Json | null
          stage_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_assignments_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_customers: {
        Row: {
          stripe_customer_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          active: boolean | null
          branch_id: string | null
          capacity: number | null
          compliance_status: Json | null
          created_at: string | null
          department_id: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          organization_id: string | null
          owner_id: string | null
          reg_number: string
        }
        Insert: {
          active?: boolean | null
          branch_id?: string | null
          capacity?: number | null
          compliance_status?: Json | null
          created_at?: string | null
          department_id?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          organization_id?: string | null
          owner_id?: string | null
          reg_number: string
        }
        Update: {
          active?: boolean | null
          branch_id?: string | null
          capacity?: number | null
          compliance_status?: Json | null
          created_at?: string | null
          department_id?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          organization_id?: string | null
          owner_id?: string | null
          reg_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "actors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      effective_permissions_raw: {
        Row: {
          action: string | null
          actor_id: string | null
          effect: string | null
          level: string | null
          scope_id: string | null
          source: string | null
        }
        Relationships: []
      }
      my_permissions: {
        Row: {
          action: string | null
          actor_id: string | null
          effect: string | null
          level: string | null
          scope_id: string | null
          source: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      bootstrap_session: { Args: never; Returns: Json }
      can_actor_perform: {
        Args: {
          action_text: string
          actor_uuid: string
          res_branch?: string
          res_dept?: string
          res_org: string
        }
        Returns: boolean
      }
      can_actor_perform_on_resource: {
        Args: {
          action_text: string
          actor_uuid: string
          resource_id: string
          resource_type: string
        }
        Returns: boolean
      }
      create_default_org_policy_groups: {
        Args: { p_org_id: string }
        Returns: undefined
      }
      current_user_can: {
        Args: {
          action_text: string
          resource_id: string
          resource_type: string
        }
        Returns: boolean
      }
      current_user_can_in_scope: {
        Args: {
          action_text: string
          scope_branch?: string
          scope_dept?: string
          scope_org: string
        }
        Returns: boolean
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_actor_ids_for_user: { Args: { user_uuid: string }; Returns: string[] }
      get_cached_actor_ids: { Args: never; Returns: string[] }
      get_my_effective_permissions: { Args: never; Returns: Json }
      is_jwt_version_current: { Args: never; Returns: boolean }
      log_access_denied: {
        Args: {
          p_action: string
          p_actor_id: string
          p_reason: string
          p_res_branch: string
          p_res_dept: string
          p_res_org: string
        }
        Returns: undefined
      }
      redeem_invite: { Args: { invite_token: string }; Returns: Json }
      scope_covers_resource: {
        Args: {
          check_level: string
          check_scope: string
          res_branch: string
          res_dept: string
          res_org: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
