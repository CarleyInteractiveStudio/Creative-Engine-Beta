-- Tabla para gestionar sesiones de colaboración activas
-- Estas sesiones tienen un límite de tiempo (ej. 8 horas)

CREATE TABLE IF NOT EXISTS public.proyectos_activos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT UNIQUE NOT NULL, -- El código corto de 6-8 caracteres
    host_id UUID REFERENCES auth.users(id), -- Usuario que creó la sesión
    url_hf TEXT NOT NULL, -- URL del Space de Hugging Face usado como relay
    metadata JSONB DEFAULT '{}'::jsonb, -- Configuración extra (ej. versión, nombre del proyecto)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '8 hours'),
    is_public BOOLEAN DEFAULT true
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_proyectos_activos_codigo ON public.proyectos_activos(codigo);
CREATE INDEX IF NOT EXISTS idx_proyectos_activos_expires ON public.proyectos_activos(expires_at);

-- Política de Seguridad (RLS)
ALTER TABLE public.proyectos_activos ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer sesiones activas que no hayan expirado
CREATE POLICY "Sesiones visibles por todos"
ON public.proyectos_activos FOR SELECT
USING (expires_at > NOW());

-- Solo usuarios autenticados pueden crear sesiones
CREATE POLICY "Usuarios pueden crear sesiones"
ON public.proyectos_activos FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Solo el host puede actualizar o borrar su sesión
CREATE POLICY "Solo el host puede modificar su sesión"
ON public.proyectos_activos FOR ALL
USING (auth.uid() = host_id);

-- Cron opcional para limpiar expirados (si tienes habilitado pg_cron)
-- SELECT cron.schedule('limpiar_sesiones_expiradas', '0 * * * *', 'DELETE FROM public.proyectos_activos WHERE expires_at < NOW()');
