# Plantillas de correo (Supabase Auth)

Estos archivos son la copia versionada de las plantillas que se cargan a mano en
el panel: **Authentication → Emails → Templates**.

Se pega el **fragmento** de cada archivo en el cuerpo del mensaje (el editor de
Supabase ya envuelve el contenido en su propio HTML, por eso los archivos no llevan
`<html>` ni `<body>`), y el asunto en el campo *Subject*.
Cada plantilla es independiente (Supabase no permite incluir un archivo común),
así que si se cambia el diseño hay que repetirlo en las cuatro.

| Archivo | Plantilla del panel | Asunto sugerido |
|---|---|---|
| `confirmar-cuenta.html` | Confirm signup | Confirmá tu cuenta de Cuerpo Raíz |
| `recuperar-contrasena.html` | Reset password | Elegí una contraseña nueva · Cuerpo Raíz |
| `cambiar-email.html` | Change email address | Confirmá tu nuevo correo · Cuerpo Raíz |
| `invitar-usuario.html` | Invite user | Te damos la bienvenida a Cuerpo Raíz |

## Colores y tipografías

Salen de `src/cursos/cursos.css` para que el mail combine con el sitio.

- Verde oscuro `#2c3524` (títulos)
- Verde medio `#6c7a56` (detalle superior y pie)
- Terracota `#b3603f` (eyebrow y botón)
- Crema `#f8f4ea` (fondo de la tarjeta)
- Arena `#f2ece0` (fondo exterior)
- Títulos: Fraunces (respaldo Georgia)
- Texto: Work Sans (respaldo Helvetica/Arial)

## Variables de Supabase

- `{{ .ConfirmationURL }}`: enlace con el token. Es el que arma cada flujo.
- `{{ .Email }}` y `{{ .NewEmail }}`: solo se usan en el cambio de correo.

## Pendiente al publicar

El `{{ .ConfirmationURL }}` nace de la **Site URL** configurada en Supabase, que hoy
apunta a `http://localhost:5173`. Cuando el sitio salga a producción hay que cambiarla
al dominio real, o los enlaces de los mails van a llevar a localhost.
