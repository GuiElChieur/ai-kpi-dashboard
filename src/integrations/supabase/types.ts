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
      achats: {
        Row: {
          adresse_facturation: string | null
          code_affaire: string | null
          date_commande: string | null
          date_livraison: string | null
          designation_produit: string | null
          id: string
          imported_at: string
          num_bl: string | null
          num_commande: string | null
          num_produit: string | null
          prix_achat: number | null
          quantite: number | null
          reference_commande: string | null
          reference_interne: string | null
          total_ht: number | null
          type_element: string | null
          type_saisie: string | null
        }
        Insert: {
          adresse_facturation?: string | null
          code_affaire?: string | null
          date_commande?: string | null
          date_livraison?: string | null
          designation_produit?: string | null
          id?: string
          imported_at?: string
          num_bl?: string | null
          num_commande?: string | null
          num_produit?: string | null
          prix_achat?: number | null
          quantite?: number | null
          reference_commande?: string | null
          reference_interne?: string | null
          total_ht?: number | null
          type_element?: string | null
          type_saisie?: string | null
        }
        Update: {
          adresse_facturation?: string | null
          code_affaire?: string | null
          date_commande?: string | null
          date_livraison?: string | null
          designation_produit?: string | null
          id?: string
          imported_at?: string
          num_bl?: string | null
          num_commande?: string | null
          num_produit?: string | null
          prix_achat?: number | null
          quantite?: number | null
          reference_commande?: string | null
          reference_interne?: string | null
          total_ht?: number | null
          type_element?: string | null
          type_saisie?: string | null
        }
        Relationships: []
      }
      appareils: {
        Row: {
          app: string | null
          date_contrainte: string | null
          date_fin_od: string | null
          fn: string | null
          id: string
          imported_at: string
          ind_pose: string | null
          ind_pret_a_poser: string | null
          lib_design: string | null
          lib_local: string | null
          local: string | null
          lot_mtg_app: string | null
          resp_pose: string | null
          resp_pret_a_poser: string | null
          t_app: string | null
        }
        Insert: {
          app?: string | null
          date_contrainte?: string | null
          date_fin_od?: string | null
          fn?: string | null
          id?: string
          imported_at?: string
          ind_pose?: string | null
          ind_pret_a_poser?: string | null
          lib_design?: string | null
          lib_local?: string | null
          local?: string | null
          lot_mtg_app?: string | null
          resp_pose?: string | null
          resp_pret_a_poser?: string | null
          t_app?: string | null
        }
        Update: {
          app?: string | null
          date_contrainte?: string | null
          date_fin_od?: string | null
          fn?: string | null
          id?: string
          imported_at?: string
          ind_pose?: string | null
          ind_pret_a_poser?: string | null
          lib_design?: string | null
          lib_local?: string | null
          local?: string | null
          lot_mtg_app?: string | null
          resp_pose?: string | null
          resp_pret_a_poser?: string | null
          t_app?: string | null
        }
        Relationships: []
      }
      cables: {
        Row: {
          apa: string | null
          apo: string | null
          cat_cablage: string | null
          cbl: string | null
          cod_zone_tirage: string | null
          date_tir_plus_tard: string | null
          date_tir_plus_tot: string | null
          date_tirage_cbl: string | null
          fn: string | null
          gam: string | null
          id: string
          imported_at: string
          ind_appro_ca: string | null
          lng_total: number | null
          lot_mtg_apo: string | null
          lot_ou_app_cbl: string | null
          nav: string | null
          pt_cbl: string | null
          repere_cbl: string | null
          resp_tirage: string | null
          stt_cbl_bord: string | null
          tot_lng_tiree: number | null
        }
        Insert: {
          apa?: string | null
          apo?: string | null
          cat_cablage?: string | null
          cbl?: string | null
          cod_zone_tirage?: string | null
          date_tir_plus_tard?: string | null
          date_tir_plus_tot?: string | null
          date_tirage_cbl?: string | null
          fn?: string | null
          gam?: string | null
          id?: string
          imported_at?: string
          ind_appro_ca?: string | null
          lng_total?: number | null
          lot_mtg_apo?: string | null
          lot_ou_app_cbl?: string | null
          nav?: string | null
          pt_cbl?: string | null
          repere_cbl?: string | null
          resp_tirage?: string | null
          stt_cbl_bord?: string | null
          tot_lng_tiree?: number | null
        }
        Update: {
          apa?: string | null
          apo?: string | null
          cat_cablage?: string | null
          cbl?: string | null
          cod_zone_tirage?: string | null
          date_tir_plus_tard?: string | null
          date_tir_plus_tot?: string | null
          date_tirage_cbl?: string | null
          fn?: string | null
          gam?: string | null
          id?: string
          imported_at?: string
          ind_appro_ca?: string | null
          lng_total?: number | null
          lot_mtg_apo?: string | null
          lot_ou_app_cbl?: string | null
          nav?: string | null
          pt_cbl?: string | null
          repere_cbl?: string | null
          resp_tirage?: string | null
          stt_cbl_bord?: string | null
          tot_lng_tiree?: number | null
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          imported_by: string | null
          rows_imported: number
          status: string
          table_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          imported_by?: string | null
          rows_imported?: number
          status?: string
          table_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          imported_by?: string | null
          rows_imported?: number
          status?: string
          table_name?: string
        }
        Relationships: []
      }
      matieres: {
        Row: {
          affaire: string | null
          date_debut: string | null
          date_livraison: string | null
          designation_produit: string | null
          id: string
          imported_at: string
          lot: string | null
          ot: string | null
          quantite_besoin: number | null
          quantite_preparation: number | null
          quantite_sortie: number | null
          reference_interne: string | null
          rep: string | null
          statut_projet: string | null
          tri: string | null
        }
        Insert: {
          affaire?: string | null
          date_debut?: string | null
          date_livraison?: string | null
          designation_produit?: string | null
          id?: string
          imported_at?: string
          lot?: string | null
          ot?: string | null
          quantite_besoin?: number | null
          quantite_preparation?: number | null
          quantite_sortie?: number | null
          reference_interne?: string | null
          rep?: string | null
          statut_projet?: string | null
          tri?: string | null
        }
        Update: {
          affaire?: string | null
          date_debut?: string | null
          date_livraison?: string | null
          designation_produit?: string | null
          id?: string
          imported_at?: string
          lot?: string | null
          ot?: string | null
          quantite_besoin?: number | null
          quantite_preparation?: number | null
          quantite_sortie?: number | null
          reference_interne?: string | null
          rep?: string | null
          statut_projet?: string | null
          tri?: string | null
        }
        Relationships: []
      }
      ot_lignes: {
        Row: {
          affaire_maitre: string | null
          avancement_effectif: number | null
          charge_previsionnelle: number | null
          charge_restante: number | null
          code_libre_table: string | null
          code_responsable: string | null
          date_jour: string | null
          id: string
          identifiant_projet: string | null
          imported_at: string
          libelle_tache: string | null
          lot: string | null
          monteur: string | null
          qte_prevue: number | null
          qte_realisee: number | null
          repere: string | null
          stade: string | null
          tp: number | null
          trigramme: string | null
          type_mo: string | null
          type_ot: string | null
          vbtr: number | null
          zone: string | null
        }
        Insert: {
          affaire_maitre?: string | null
          avancement_effectif?: number | null
          charge_previsionnelle?: number | null
          charge_restante?: number | null
          code_libre_table?: string | null
          code_responsable?: string | null
          date_jour?: string | null
          id?: string
          identifiant_projet?: string | null
          imported_at?: string
          libelle_tache?: string | null
          lot?: string | null
          monteur?: string | null
          qte_prevue?: number | null
          qte_realisee?: number | null
          repere?: string | null
          stade?: string | null
          tp?: number | null
          trigramme?: string | null
          type_mo?: string | null
          type_ot?: string | null
          vbtr?: number | null
          zone?: string | null
        }
        Update: {
          affaire_maitre?: string | null
          avancement_effectif?: number | null
          charge_previsionnelle?: number | null
          charge_restante?: number | null
          code_libre_table?: string | null
          code_responsable?: string | null
          date_jour?: string | null
          id?: string
          identifiant_projet?: string | null
          imported_at?: string
          libelle_tache?: string | null
          lot?: string | null
          monteur?: string | null
          qte_prevue?: number | null
          qte_realisee?: number | null
          repere?: string | null
          stade?: string | null
          tp?: number | null
          trigramme?: string | null
          type_mo?: string | null
          type_ot?: string | null
          vbtr?: number | null
          zone?: string | null
        }
        Relationships: []
      }
      ots: {
        Row: {
          affaire: string | null
          avancement_effectif: number | null
          charge_previsionnelle: number | null
          code_responsable: string | null
          date_debut_theorique: string | null
          date_jour: string | null
          debut_plus_tard: string | null
          debut_plus_tot: string | null
          fin_plus_tard: string | null
          fin_plus_tot: string | null
          id: string
          imported_at: string
          libelle_projet: string | null
          lot: string | null
          mo_prev: number | null
          nature_ot: string | null
          num_ot: string | null
          societe: string | null
          stade: string | null
          statut: string | null
          statut_projet: string | null
          tp: number | null
          tranche: string | null
          type: string | null
          type_ot_bis: string | null
          vbtr: number | null
          zone: string | null
        }
        Insert: {
          affaire?: string | null
          avancement_effectif?: number | null
          charge_previsionnelle?: number | null
          code_responsable?: string | null
          date_debut_theorique?: string | null
          date_jour?: string | null
          debut_plus_tard?: string | null
          debut_plus_tot?: string | null
          fin_plus_tard?: string | null
          fin_plus_tot?: string | null
          id?: string
          imported_at?: string
          libelle_projet?: string | null
          lot?: string | null
          mo_prev?: number | null
          nature_ot?: string | null
          num_ot?: string | null
          societe?: string | null
          stade?: string | null
          statut?: string | null
          statut_projet?: string | null
          tp?: number | null
          tranche?: string | null
          type?: string | null
          type_ot_bis?: string | null
          vbtr?: number | null
          zone?: string | null
        }
        Update: {
          affaire?: string | null
          avancement_effectif?: number | null
          charge_previsionnelle?: number | null
          code_responsable?: string | null
          date_debut_theorique?: string | null
          date_jour?: string | null
          debut_plus_tard?: string | null
          debut_plus_tot?: string | null
          fin_plus_tard?: string | null
          fin_plus_tot?: string | null
          id?: string
          imported_at?: string
          libelle_projet?: string | null
          lot?: string | null
          mo_prev?: number | null
          nature_ot?: string | null
          num_ot?: string | null
          societe?: string | null
          stade?: string | null
          statut?: string | null
          statut_projet?: string | null
          tp?: number | null
          tranche?: string | null
          type?: string | null
          type_ot_bis?: string | null
          vbtr?: number | null
          zone?: string | null
        }
        Relationships: []
      }
      pointages: {
        Row: {
          affaire_maitre: string | null
          code_99: string | null
          code_libre_alpha: string | null
          code_libre_alpha1: string | null
          code_libre_alpha3: string | null
          code_libre_table: string | null
          date_modif: string | null
          date_saisie: string | null
          employeur: string | null
          equipe: string | null
          id: string
          identifiant_projet: string | null
          imported_at: string
          intervenant: string | null
          intitule: string | null
          intitule_affaire: string | null
          nom_prenom: string | null
          num_affaire: string | null
          objet_travail: string | null
          quantite: number | null
          username: string | null
        }
        Insert: {
          affaire_maitre?: string | null
          code_99?: string | null
          code_libre_alpha?: string | null
          code_libre_alpha1?: string | null
          code_libre_alpha3?: string | null
          code_libre_table?: string | null
          date_modif?: string | null
          date_saisie?: string | null
          employeur?: string | null
          equipe?: string | null
          id?: string
          identifiant_projet?: string | null
          imported_at?: string
          intervenant?: string | null
          intitule?: string | null
          intitule_affaire?: string | null
          nom_prenom?: string | null
          num_affaire?: string | null
          objet_travail?: string | null
          quantite?: number | null
          username?: string | null
        }
        Update: {
          affaire_maitre?: string | null
          code_99?: string | null
          code_libre_alpha?: string | null
          code_libre_alpha1?: string | null
          code_libre_alpha3?: string | null
          code_libre_table?: string | null
          date_modif?: string | null
          date_saisie?: string | null
          employeur?: string | null
          equipe?: string | null
          id?: string
          identifiant_projet?: string | null
          imported_at?: string
          intervenant?: string | null
          intitule?: string | null
          intitule_affaire?: string | null
          nom_prenom?: string | null
          num_affaire?: string | null
          objet_travail?: string | null
          quantite?: number | null
          username?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
