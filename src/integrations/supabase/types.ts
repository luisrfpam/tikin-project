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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      blockchain_transactions: {
        Row: {
          actor_id: string | null
          amount: number | null
          created_at: string
          entity_type: string
          error: string | null
          id: string
          internal_id: string
          issuer_id: string | null
          memo_hash: string | null
          operation: string
          status: string
          stellar_ledger: number | null
          stellar_tx_hash: string | null
        }
        Insert: {
          actor_id?: string | null
          amount?: number | null
          created_at?: string
          entity_type: string
          error?: string | null
          id?: string
          internal_id: string
          issuer_id?: string | null
          memo_hash?: string | null
          operation: string
          status?: string
          stellar_ledger?: number | null
          stellar_tx_hash?: string | null
        }
        Update: {
          actor_id?: string | null
          amount?: number | null
          created_at?: string
          entity_type?: string
          error?: string | null
          id?: string
          internal_id?: string
          issuer_id?: string | null
          memo_hash?: string | null
          operation?: string
          status?: string
          stellar_ledger?: number | null
          stellar_tx_hash?: string | null
        }
        Relationships: []
      }
      charges: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          establishment_id: string
          id: string
          paid_at: string | null
          status: string
          stellar_tx_hash: string | null
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          establishment_id: string
          id?: string
          paid_at?: string | null
          status?: string
          stellar_tx_hash?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          establishment_id?: string
          id?: string
          paid_at?: string | null
          status?: string
          stellar_tx_hash?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      establishments: {
        Row: {
          accepted_categories: string[]
          address: string | null
          bairro: string | null
          category: string | null
          cep: string | null
          cidade: string | null
          cnae: string
          cnae_validated: boolean
          cnpj: string
          complemento: string | null
          contact_email: string | null
          created_at: string
          geolocation: string | null
          id: string
          latitude: number | null
          logradouro: string | null
          longitude: number | null
          name: string
          numero: string | null
          opening_hours: string | null
          phone: string | null
          status: string
          trade_name: string | null
          uf: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_categories?: string[]
          address?: string | null
          bairro?: string | null
          category?: string | null
          cep?: string | null
          cidade?: string | null
          cnae: string
          cnae_validated?: boolean
          cnpj: string
          complemento?: string | null
          contact_email?: string | null
          created_at?: string
          geolocation?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          name: string
          numero?: string | null
          opening_hours?: string | null
          phone?: string | null
          status?: string
          trade_name?: string | null
          uf?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_categories?: string[]
          address?: string | null
          bairro?: string | null
          category?: string | null
          cep?: string | null
          cidade?: string | null
          cnae?: string
          cnae_validated?: boolean
          cnpj?: string
          complemento?: string | null
          contact_email?: string | null
          created_at?: string
          geolocation?: string | null
          id?: string
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          name?: string
          numero?: string | null
          opening_hours?: string | null
          phone?: string | null
          status?: string
          trade_name?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      etherfuse_customers: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          issuer_id: string
          kyc_status: string
          kyc_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          issuer_id: string
          kyc_status?: string
          kyc_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          issuer_id?: string
          kyc_status?: string
          kyc_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          beneficiary_id: string
          created_at: string
          establishment_id: string
          id: string
        }
        Insert: {
          beneficiary_id: string
          created_at?: string
          establishment_id: string
          id?: string
        }
        Update: {
          beneficiary_id?: string
          created_at?: string
          establishment_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
        ]
      }
      issuer_beneficiaries: {
        Row: {
          activated_by: string | null
          beneficiary_id: string
          created_at: string
          id: string
          issuer_id: string
          status: string
          stellar_tx_hash: string | null
          updated_at: string
        }
        Insert: {
          activated_by?: string | null
          beneficiary_id: string
          created_at?: string
          id?: string
          issuer_id: string
          status?: string
          stellar_tx_hash?: string | null
          updated_at?: string
        }
        Update: {
          activated_by?: string | null
          beneficiary_id?: string
          created_at?: string
          id?: string
          issuer_id?: string
          status?: string
          stellar_tx_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issuer_beneficiaries_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "issuers"
            referencedColumns: ["id"]
          },
        ]
      }
      issuer_funds: {
        Row: {
          allocated: number
          auto_rollover: boolean
          category_allocated: Json
          category_caps: Json
          created_at: string
          id: string
          issuer_id: string
          last_stellar_tx_hash: string | null
          month: string
          monthly_budget: number
          notes: string | null
          onramp_order_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          allocated?: number
          auto_rollover?: boolean
          category_allocated?: Json
          category_caps?: Json
          created_at?: string
          id?: string
          issuer_id: string
          last_stellar_tx_hash?: string | null
          month: string
          monthly_budget?: number
          notes?: string | null
          onramp_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          allocated?: number
          auto_rollover?: boolean
          category_allocated?: Json
          category_caps?: Json
          created_at?: string
          id?: string
          issuer_id?: string
          last_stellar_tx_hash?: string | null
          month?: string
          monthly_budget?: number
          notes?: string | null
          onramp_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issuer_funds_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "issuers"
            referencedColumns: ["id"]
          },
        ]
      }
      issuer_stellar_wallets: {
        Row: {
          created_at: string
          id: string
          issuer_id: string
          public_key: string
          secret_encrypted: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          issuer_id: string
          public_key: string
          secret_encrypted: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          issuer_id?: string
          public_key?: string
          secret_encrypted?: string
          updated_at?: string
        }
        Relationships: []
      }
      issuers: {
        Row: {
          cnpj: string
          company_name: string
          corporate_email: string | null
          created_at: string
          fund_balance: number
          id: string
          is_enabled: boolean
          razao_social: string | null
          responsible_name: string | null
          responsible_role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj: string
          company_name: string
          corporate_email?: string | null
          created_at?: string
          fund_balance?: number
          id?: string
          is_enabled?: boolean
          razao_social?: string | null
          responsible_name?: string | null
          responsible_role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj?: string
          company_name?: string
          corporate_email?: string | null
          created_at?: string
          fund_balance?: number
          id?: string
          is_enabled?: boolean
          razao_social?: string | null
          responsible_name?: string | null
          responsible_role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      merchant_pix_keys: {
        Row: {
          created_at: string
          establishment_id: string
          id: string
          is_default: boolean
          key_type: string
          key_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          establishment_id: string
          id?: string
          is_default?: boolean
          key_type: string
          key_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          establishment_id?: string
          id?: string
          is_default?: boolean
          key_type?: string
          key_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      offramp_orders: {
        Row: {
          amount_brl: number
          created_at: string
          error: string | null
          establishment_id: string
          etherfuse_order_id: string | null
          id: string
          issuer_id: string
          pix_key_type: string | null
          pix_key_value: string | null
          pix_paid_at: string | null
          status: string
          stellar_burn_tx_hash: string | null
          transaction_id: string
          updated_at: string
          voucher_id: string
        }
        Insert: {
          amount_brl: number
          created_at?: string
          error?: string | null
          establishment_id: string
          etherfuse_order_id?: string | null
          id?: string
          issuer_id: string
          pix_key_type?: string | null
          pix_key_value?: string | null
          pix_paid_at?: string | null
          status?: string
          stellar_burn_tx_hash?: string | null
          transaction_id: string
          updated_at?: string
          voucher_id: string
        }
        Update: {
          amount_brl?: number
          created_at?: string
          error?: string | null
          establishment_id?: string
          etherfuse_order_id?: string | null
          id?: string
          issuer_id?: string
          pix_key_type?: string | null
          pix_key_value?: string | null
          pix_paid_at?: string | null
          status?: string
          stellar_burn_tx_hash?: string | null
          transaction_id?: string
          updated_at?: string
          voucher_id?: string
        }
        Relationships: []
      }
      onboarding_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      onramp_orders: {
        Row: {
          amount_brl: number
          created_at: string
          error: string | null
          etherfuse_order_id: string | null
          expires_at: string | null
          id: string
          issuer_funds_id: string | null
          issuer_id: string
          pix_copy_paste: string | null
          pix_qr: string | null
          status: string
          stellar_tx_hash: string | null
          updated_at: string
        }
        Insert: {
          amount_brl: number
          created_at?: string
          error?: string | null
          etherfuse_order_id?: string | null
          expires_at?: string | null
          id?: string
          issuer_funds_id?: string | null
          issuer_id: string
          pix_copy_paste?: string | null
          pix_qr?: string | null
          status?: string
          stellar_tx_hash?: string | null
          updated_at?: string
        }
        Update: {
          amount_brl?: number
          created_at?: string
          error?: string | null
          etherfuse_order_id?: string | null
          expires_at?: string | null
          id?: string
          issuer_funds_id?: string | null
          issuer_id?: string
          pix_copy_paste?: string | null
          pix_qr?: string | null
          status?: string
          stellar_tx_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          biometry_token: string | null
          biometry_verified: boolean
          cnpj: string | null
          cpf: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          biometry_token?: string | null
          biometry_verified?: boolean
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          biometry_token?: string | null
          biometry_verified?: boolean
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          beneficiary_name: string | null
          created_at: string
          description: string | null
          establishment_id: string
          fee_percent: number
          id: string
          quantum_proof: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          stellar_tx_hash: string | null
          transfero_tx_id: string | null
          tx_type: string
          voucher_category: string | null
          voucher_id: string
        }
        Insert: {
          amount: number
          beneficiary_name?: string | null
          created_at?: string
          description?: string | null
          establishment_id: string
          fee_percent?: number
          id?: string
          quantum_proof?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          stellar_tx_hash?: string | null
          transfero_tx_id?: string | null
          tx_type?: string
          voucher_category?: string | null
          voucher_id: string
        }
        Update: {
          amount?: number
          beneficiary_name?: string | null
          created_at?: string
          description?: string | null
          establishment_id?: string
          fee_percent?: number
          id?: string
          quantum_proof?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          stellar_tx_hash?: string | null
          transfero_tx_id?: string | null
          tx_type?: string
          voucher_category?: string | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_establishment_id_fkey"
            columns: ["establishment_id"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voucher_categories: {
        Row: {
          active: boolean
          created_at: string
          icon: string | null
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      voucher_statuses: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          sort_order: number
          tone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id: string
          label: string
          sort_order?: number
          tone?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      vouchers: {
        Row: {
          beneficiary_cpf: string
          beneficiary_id: string | null
          created_at: string
          expiration_date: string
          id: string
          issuer_id: string
          quantumcert_asset_id: string | null
          remaining_value: number
          rules: Json
          status: Database["public"]["Enums"]["voucher_status"]
          stellar_tx_hash: string | null
          updated_at: string
          value: number
        }
        Insert: {
          beneficiary_cpf: string
          beneficiary_id?: string | null
          created_at?: string
          expiration_date: string
          id?: string
          issuer_id: string
          quantumcert_asset_id?: string | null
          remaining_value: number
          rules?: Json
          status?: Database["public"]["Enums"]["voucher_status"]
          stellar_tx_hash?: string | null
          updated_at?: string
          value: number
        }
        Update: {
          beneficiary_cpf?: string
          beneficiary_id?: string | null
          created_at?: string
          expiration_date?: string
          id?: string
          issuer_id?: string
          quantumcert_asset_id?: string | null
          remaining_value?: number
          rules?: Json
          status?: Database["public"]["Enums"]["voucher_status"]
          stellar_tx_hash?: string | null
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_issuer_id_fkey"
            columns: ["issuer_id"]
            isOneToOne: false
            referencedRelation: "issuers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_issuers: {
        Args: { _admin_email: string; _admin_password: string }
        Returns: {
          cnpj: string
          company_name: string
          corporate_email: string | null
          created_at: string
          id: string
          is_enabled: boolean
          razao_social: string | null
          responsible_name: string | null
          responsible_role: string | null
          updated_at: string
          user_id: string
        }[]
      }
      admin_set_issuer_enabled: {
        Args: {
          _admin_email: string
          _admin_password: string
          _is_enabled: boolean
          _issuer_id: string
        }
        Returns: {
          cnpj: string
          company_name: string
          corporate_email: string | null
          created_at: string
          fund_balance: number
          id: string
          is_enabled: boolean
          razao_social: string | null
          responsible_name: string | null
          responsible_role: string | null
          updated_at: string
          user_id: string
        }
      }
      admin_update_issuer: {
        Args: {
          _admin_email: string
          _admin_password: string
          _cnpj?: string
          _company_name?: string
          _corporate_email?: string
          _issuer_id: string
          _razao_social?: string
          _responsible_name?: string
          _responsible_role?: string
        }
        Returns: {
          cnpj: string
          company_name: string
          corporate_email: string | null
          created_at: string
          fund_balance: number
          id: string
          is_enabled: boolean
          razao_social: string | null
          responsible_name: string | null
          responsible_role: string | null
          updated_at: string
          user_id: string
        }
      }
      admin_list_issuers_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          cnpj: string
          company_name: string
          corporate_email: string | null
          created_at: string
          id: string
          is_enabled: boolean
          razao_social: string | null
          responsible_name: string | null
          responsible_role: string | null
          updated_at: string
          user_id: string
        }[]
      }
      admin_set_issuer_enabled_secure: {
        Args: {
          _is_enabled: boolean
          _issuer_id: string
        }
        Returns: {
          cnpj: string
          company_name: string
          corporate_email: string | null
          created_at: string
          fund_balance: number
          id: string
          is_enabled: boolean
          razao_social: string | null
          responsible_name: string | null
          responsible_role: string | null
          updated_at: string
          user_id: string
        }
      }
      admin_update_issuer_secure: {
        Args: {
          _cnpj?: string
          _company_name?: string
          _corporate_email?: string
          _issuer_id: string
          _razao_social?: string
          _responsible_name?: string
          _responsible_role?: string
        }
        Returns: {
          cnpj: string
          company_name: string
          corporate_email: string | null
          created_at: string
          fund_balance: number
          id: string
          is_enabled: boolean
          razao_social: string | null
          responsible_name: string | null
          responsible_role: string | null
          updated_at: string
          user_id: string
        }
      }
      can_request_password_recovery: {
        Args: { _email: string }
        Returns: boolean
      }
      consume_issuer_funds:
        | { Args: { _issuer_id: string; _value: number }; Returns: undefined }
        | {
            Args: { _category?: string; _issuer_id: string; _value: number }
            Returns: undefined
          }
      get_issuer_beneficiaries: {
        Args: { _issuer_id: string }
        Returns: {
          cpf_masked: string
          id: string
          name: string
          status: string
        }[]
      }
      get_issuer_beneficiary_cpf: {
        Args: { _beneficiary_id: string; _issuer_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_issuer_owner: {
        Args: { _issuer_id: string; _user_id: string }
        Returns: boolean
      }
      is_current_issuer_enabled: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_tikin_admin_credentials: {
        Args: { _admin_email: string; _admin_password: string }
        Returns: boolean
      }
      is_tikin_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      lookup_beneficiary_name_by_cpf: {
        Args: { _cpf: string }
        Returns: string
      }
      lookup_email_by_identifier: {
        Args: {
          _expected_role?: Database["public"]["Enums"]["app_role"] | null
          _identifier: string
        }
        Returns: string
      }
      normalize_category: { Args: { _raw: string }; Returns: string }
      pay_payment: {
        Args: {
          _amount: number
          _charge_id?: string
          _establishment_id: string
          _slices: Json
        }
        Returns: Json
      }
      unaccent_simple: { Args: { _t: string }; Returns: string }
    }
    Enums: {
      app_role: "emissor" | "beneficiario" | "lojista"
      transaction_status: "pending" | "confirmed" | "failed" | "reversed"
      voucher_status:
        | "active"
        | "partially_used"
        | "used"
        | "expired"
        | "cancelled"
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
    Enums: {
      app_role: ["emissor", "beneficiario", "lojista"],
      transaction_status: ["pending", "confirmed", "failed", "reversed"],
      voucher_status: [
        "active",
        "partially_used",
        "used",
        "expired",
        "cancelled",
      ],
    },
  },
} as const
