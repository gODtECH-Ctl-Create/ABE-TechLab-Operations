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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_provider_usage: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          input_tokens: number | null
          output_tokens: number | null
          provider: string
          request_id: string | null
          status: string
          task: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          provider: string
          request_id?: string | null
          status: string
          task: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          provider?: string
          request_id?: string | null
          status?: string
          task?: string
        }
        Relationships: []
      }
      ai_runs: {
        Row: {
          agent: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_tokens: number | null
          metadata: Json
          mode: string
          model: string | null
          output_tokens: number | null
          provider: string | null
          request_id: string
          status: string
          task: string
        }
        Insert: {
          agent: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          metadata?: Json
          mode: string
          model?: string | null
          output_tokens?: number | null
          provider?: string | null
          request_id: string
          status: string
          task: string
        }
        Update: {
          agent?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_tokens?: number | null
          metadata?: Json
          mode?: string
          model?: string | null
          output_tokens?: number | null
          provider?: string | null
          request_id?: string
          status?: string
          task?: string
        }
        Relationships: []
      }
      ai_tool_calls: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input: Json
          output: Json
          run_id: string
          status: string
          tool_name: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input?: Json
          output?: Json
          run_id: string
          status: string
          tool_name: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input?: Json
          output?: Json
          run_id?: string
          status?: string
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_calls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_actions: {
        Row: {
          action_type: string
          completed_at: string | null
          conversation_id: string | null
          created_at: string
          error: string | null
          id: string
          input: Json
          lead_id: string | null
          output: Json
          status: string
          tool_name: string | null
        }
        Insert: {
          action_type: string
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input?: Json
          lead_id?: string | null
          output?: Json
          status?: string
          tool_name?: string | null
        }
        Update: {
          action_type?: string
          completed_at?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input?: Json
          lead_id?: string | null
          output?: Json
          status?: string
          tool_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_actions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_conversations: {
        Row: {
          ai_enabled: boolean
          channel: string
          closed_at: string | null
          created_at: string
          current_step_id: string | null
          id: string
          last_message_at: string | null
          lead_id: string
          started_at: string
          status: string
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          ai_enabled?: boolean
          channel: string
          closed_at?: string | null
          created_at?: string
          current_step_id?: string | null
          id?: string
          last_message_at?: string | null
          lead_id: string
          started_at?: string
          status?: string
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          ai_enabled?: boolean
          channel?: string
          closed_at?: string | null
          created_at?: string
          current_step_id?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_conversations_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "assistant_workflow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_conversations_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "assistant_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_handoffs: {
        Row: {
          accepted_at: string | null
          assigned_to: string | null
          conversation_id: string
          id: string
          lead_id: string
          notes: string | null
          priority: string
          reason: string
          requested_at: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_to?: string | null
          conversation_id: string
          id?: string
          lead_id: string
          notes?: string | null
          priority?: string
          reason: string
          requested_at?: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_to?: string | null
          conversation_id?: string
          id?: string
          lead_id?: string
          notes?: string | null
          priority?: string
          reason?: string
          requested_at?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_handoffs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_handoffs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_knowledge: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          service: string | null
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          service?: string | null
          status?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          service?: string | null
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          message_type: string
          metadata: Json
          provider_message_id: string | null
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json
          provider_message_id?: string | null
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json
          provider_message_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_requirements: {
        Row: {
          confidence: number | null
          conversation_id: string | null
          created_at: string
          id: string
          key: string
          lead_id: string
          source_message_id: string | null
          status: string
          updated_at: string
          value: Json
          value_type: string
          workflow_id: string | null
        }
        Insert: {
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          key: string
          lead_id: string
          source_message_id?: string | null
          status?: string
          updated_at?: string
          value?: Json
          value_type?: string
          workflow_id?: string | null
        }
        Update: {
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          key?: string
          lead_id?: string
          source_message_id?: string | null
          status?: string
          updated_at?: string
          value?: Json
          value_type?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_requirements_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_requirements_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_requirements_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "assistant_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_requirements_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "assistant_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_workflow_steps: {
        Row: {
          configuration: Json
          created_at: string
          description: string | null
          id: string
          name: string
          required: boolean
          step_order: number
          step_type: string
          workflow_id: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          required?: boolean
          step_order: number
          step_type?: string
          workflow_id: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          required?: boolean
          step_order?: number
          step_type?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "assistant_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          service: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          service?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          service?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      campaign_messages: {
        Row: {
          body: string
          campaign_id: string
          created_at: string
          id: string
          provider_message_id: string | null
          scheduled_for: string | null
          stage: string
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          body: string
          campaign_id: string
          created_at?: string
          id?: string
          provider_message_id?: string | null
          scheduled_for?: string | null
          stage: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          campaign_id?: string
          created_at?: string
          id?: string
          provider_message_id?: string | null
          scheduled_for?: string | null
          stage?: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          channel: string
          created_at: string
          id: string
          lead_id: string | null
          status: string
          strategy_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          channel: string
          created_at?: string
          id?: string
          lead_id?: string | null
          status?: string
          strategy_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          channel?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          status?: string
          strategy_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "outreach_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          email: string | null
          first_name: string
          id: string
          is_decision_maker: boolean
          job_title: string | null
          last_name: string | null
          notes: string | null
          organisation_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_decision_maker?: boolean
          job_title?: string | null
          last_name?: string | null
          notes?: string | null
          organisation_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_decision_maker?: boolean
          job_title?: string | null
          last_name?: string | null
          notes?: string | null
          organisation_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_records: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          entity_id: string
          entity_type: string
          id: string
          reason: string | null
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          entity_id: string
          entity_type: string
          id?: string
          reason?: string | null
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      email_events: {
        Row: {
          campaign_id: string | null
          campaign_message_id: string | null
          event_type: string
          id: string
          lead_id: string | null
          occurred_at: string
          payload: Json
          provider: string
          provider_event_id: string
          received_at: string
        }
        Insert: {
          campaign_id?: string | null
          campaign_message_id?: string | null
          event_type: string
          id?: string
          lead_id?: string | null
          occurred_at: string
          payload?: Json
          provider: string
          provider_event_id: string
          received_at?: string
        }
        Update: {
          campaign_id?: string | null
          campaign_message_id?: string | null
          event_type?: string
          id?: string
          lead_id?: string | null
          occurred_at?: string
          payload?: Json
          provider?: string
          provider_event_id?: string
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_campaign_message_id_fkey"
            columns: ["campaign_message_id"]
            isOneToOne: false
            referencedRelation: "campaign_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          blocked_reason: string | null
          campaign_message_id: string
          created_at: string
          id: string
          lead_id: string
          scheduled_for: string
          status: string
          updated_at: string
        }
        Insert: {
          blocked_reason?: string | null
          campaign_message_id: string
          created_at?: string
          id?: string
          lead_id: string
          scheduled_for: string
          status?: string
          updated_at?: string
        }
        Update: {
          blocked_reason?: string | null
          campaign_message_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          scheduled_for?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_campaign_message_id_fkey"
            columns: ["campaign_message_id"]
            isOneToOne: false
            referencedRelation: "campaign_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          details: string | null
          id: string
          invoice_id: string
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          details?: string | null
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          details?: string | null
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          account_name: string | null
          account_number: string | null
          amount_paid: number
          bank_name: string | null
          business_address: string | null
          business_email: string | null
          business_name: string
          business_phone: string | null
          business_website: string | null
          client_address: string | null
          client_company: string
          client_contact: string | null
          client_email: string | null
          client_phone: string | null
          created_at: string
          created_by: string | null
          currency: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          project: string | null
          status: string
          tax: number
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          amount_paid?: number
          bank_name?: string | null
          business_address?: string | null
          business_email?: string | null
          business_name: string
          business_phone?: string | null
          business_website?: string | null
          client_address?: string | null
          client_company: string
          client_contact?: string | null
          client_email?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          project?: string | null
          status?: string
          tax?: number
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          amount_paid?: number
          bank_name?: string | null
          business_address?: string | null
          business_email?: string | null
          business_name?: string
          business_phone?: string | null
          business_website?: string | null
          client_address?: string | null
          client_company?: string
          client_contact?: string | null
          client_email?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          project?: string | null
          status?: string
          tax?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          id: string
          next_action: string | null
          next_action_due_at: string | null
          organisation_id: string
          owner_id: string | null
          preferred_contact_channel: string | null
          problem_summary: string | null
          prospect_id: string | null
          score: number | null
          service_interest: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          id?: string
          next_action?: string | null
          next_action_due_at?: string | null
          organisation_id: string
          owner_id?: string | null
          preferred_contact_channel?: string | null
          problem_summary?: string | null
          prospect_id?: string | null
          score?: number | null
          service_interest?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          id?: string
          next_action?: string | null
          next_action_due_at?: string | null
          organisation_id?: string
          owner_id?: string | null
          preferred_contact_channel?: string | null
          problem_summary?: string | null
          prospect_id?: string | null
          score?: number | null
          service_interest?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          name: string
          next_action: string | null
          next_action_due_at: string | null
          organisation_id: string
          owner_id: string | null
          probability: number | null
          source: string
          stage: string
          updated_at: string
          value: number | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          name: string
          next_action?: string | null
          next_action_due_at?: string | null
          organisation_id: string
          owner_id?: string | null
          probability?: number | null
          source?: string
          stage?: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          next_action?: string | null
          next_action_due_at?: string | null
          organisation_id?: string
          owner_id?: string | null
          probability?: number | null
          source?: string
          stage?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          geography: string | null
          id: string
          industry: string | null
          name: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          geography?: string | null
          id?: string
          industry?: string | null
          name: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          geography?: string | null
          id?: string
          industry?: string | null
          name?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      outreach_strategies: {
        Row: {
          angle: string | null
          channel: string
          confidence: number | null
          created_at: string
          id: string
          lead_id: string | null
          messages: Json
          objective: string
          persona: string | null
          prospect_id: string
          rationale: Json
          sequence: Json
          service: string | null
          status: string
          talking_points: Json
          updated_at: string
          value_proposition: string | null
        }
        Insert: {
          angle?: string | null
          channel: string
          confidence?: number | null
          created_at?: string
          id?: string
          lead_id?: string | null
          messages?: Json
          objective: string
          persona?: string | null
          prospect_id: string
          rationale?: Json
          sequence?: Json
          service?: string | null
          status?: string
          talking_points?: Json
          updated_at?: string
          value_proposition?: string | null
        }
        Update: {
          angle?: string | null
          channel?: string
          confidence?: number | null
          created_at?: string
          id?: string
          lead_id?: string | null
          messages?: Json
          objective?: string
          persona?: string | null
          prospect_id?: string
          rationale?: Json
          sequence?: Json
          service?: string | null
          status?: string
          talking_points?: Json
          updated_at?: string
          value_proposition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_strategies_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_strategies_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          confidence: number | null
          created_at: string
          evidence: Json
          id: string
          likely_need: string | null
          organisation_id: string
          recommended_service: string | null
          score: number | null
          status: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          likely_need?: string | null
          organisation_id: string
          recommended_service?: string | null
          score?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          evidence?: Json
          id?: string
          likely_need?: string | null
          organisation_id?: string
          recommended_service?: string | null
          score?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      qualifications: {
        Row: {
          classification: string
          confidence: number
          created_at: string
          id: string
          next_action: string | null
          prospect_id: string
          reasons: Json
          recommended_service: string | null
          score: number
          source: string
        }
        Insert: {
          classification: string
          confidence: number
          created_at?: string
          id?: string
          next_action?: string | null
          prospect_id: string
          reasons?: Json
          recommended_service?: string | null
          score: number
          source?: string
        }
        Update: {
          classification?: string
          confidence?: number
          created_at?: string
          id?: string
          next_action?: string | null
          prospect_id?: string
          reasons?: Json
          recommended_service?: string | null
          score?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "qualifications_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      research_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          geography: string | null
          id: string
          industries: Json
          provider: string | null
          query: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          geography?: string | null
          id?: string
          industries?: Json
          provider?: string | null
          query: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          geography?: string | null
          id?: string
          industries?: Json
          provider?: string | null
          query?: string
          status?: string
        }
        Relationships: []
      }
      research_sources: {
        Row: {
          id: string
          prospect_id: string | null
          provider: string | null
          research_request_id: string
          retrieved_at: string
          snippet: string | null
          title: string
          url: string
        }
        Insert: {
          id?: string
          prospect_id?: string | null
          provider?: string | null
          research_request_id: string
          retrieved_at?: string
          snippet?: string | null
          title: string
          url: string
        }
        Update: {
          id?: string
          prospect_id?: string | null
          provider?: string | null
          research_request_id?: string
          retrieved_at?: string
          snippet?: string | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_sources_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_sources_research_request_id_fkey"
            columns: ["research_request_id"]
            isOneToOne: false
            referencedRelation: "research_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      system_heartbeat: {
        Row: {
          created_at: string
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          id: number
          name?: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_dataset_meta: {
        Row: {
          id: boolean
          is_demo: boolean
          label: string
          updated_at: string
        }
        Insert: {
          id?: boolean
          is_demo?: boolean
          label?: string
          updated_at?: string
        }
        Update: {
          id?: boolean
          is_demo?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          revoked_at: string | null
          role: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          revoked_at?: string | null
          role: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          revoked_at?: string | null
          role?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_user_role: {
        Args: { target_role: string; target_user_id: string }
        Returns: boolean
      }
      get_my_role: { Args: never; Returns: string }
      has_operations_access: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
