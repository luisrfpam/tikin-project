/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SUPABASE_PROJECT_ID?: string;
	readonly VITE_TIKIN_ADMIN_EMAIL?: string;
	readonly VITE_TIKIN_ADMIN_PASSWORD?: string;
	readonly TIKIN_ADMIN_EMAIL?: string;
	readonly TIKIN_ADMIN_PASSWORD?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
