# Matriz de trazabilidad · GestIT V1

Generada automáticamente con `node matriz.js` a partir del último resultado de las pruebas.

**Criterios de aceptación:** 119 · ✅ pasan: 116 · ❌ con falla: 3 · ⚪ sin ejecutar: 0
**Casos automatizados:** 229 · ✅ 218 · ❌ 11

| CA | HU | Resultado | Casos de prueba |
|---|---|---|---|
| CA-01.1 | HU-01 | ✅ pasa | ✅ [api] CA-01.1 usuario activo con credenciales válidas accede y recibe su nombre y rol<br>✅ [api] CA-01.1 el usuario se reconoce sin distinguir mayúsculas<br>✅ [ui] CA-01.1 el Administrador ve su nombre, su rol y todas las opciones del menú |
| CA-01.2 | HU-01 | ✅ pasa | ✅ [api] CA-01.2 contraseña incorrecta: mensaje genérico<br>✅ [ui] CA-01.2 contraseña incorrecta: mensaje genérico, sigue en el login y la contraseña se vacía |
| CA-01.3 | HU-01 | ✅ pasa | ✅ [api] CA-01.3 usuario inexistente: exactamente el mismo mensaje<br>✅ [ui] CA-01.3 / CA-01.4 usuario inexistente o desactivado: exactamente el mismo mensaje |
| CA-01.4 | HU-01 | ✅ pasa | ✅ [api] CA-01.4 usuario desactivado con contraseña correcta: mismo mensaje y no accede<br>✅ [ui] CA-01.3 / CA-01.4 usuario inexistente o desactivado: exactamente el mismo mensaje |
| CA-01.5 | HU-01 | ✅ pasa | ✅ [api] CA-01.5 campos vacíos: error por campo y no cuenta como intento fallido<br>✅ [ui] CA-01.5 campos vacíos: el error se indica junto a cada campo |
| CA-01.6 | HU-01 | ✅ pasa | ✅ [api] CA-01.6 / CA-01.7 el quinto fallo bloquea 15 minutos y luego se rechaza la contraseña correcta |
| CA-01.7 | HU-01 | ✅ pasa | ✅ [api] CA-01.6 / CA-01.7 el quinto fallo bloquea 15 minutos y luego se rechaza la contraseña correcta |
| CA-01.8 | HU-01 | ✅ pasa | ✅ [tiempos] CA-01.8 @tiempos vencido el bloqueo, la contraseña correcta permite ingresar<br>✅ [tiempos] CA-01.8 @tiempos vencido el bloqueo, el contador vuelve a cero |
| CA-01.9 | HU-01 | ✅ pasa | ✅ [api] CA-01.9 un ingreso correcto reinicia el contador de intentos |
| CA-01.10 | HU-01 | ✅ pasa | ✅ [tiempos] CA-01.10 @tiempos sin actividad la sesión expira y la API informa la expiración<br>✅ [tiempos] CA-01.10 @tiempos cada operación renueva el plazo<br>✅ [tiempos] CA-01.10 @tiempos en la interfaz, la siguiente acción lleva al login con «Tu sesión expiró por inactividad» |
| CA-01.11 | HU-01 | ✅ pasa | ✅ [api] CA-01.11 una pantalla interna sin sesión redirige al login conservando el destino<br>✅ [ui] CA-01.11 una URL interna sin sesión lleva al login y, tras ingresar, vuelve a esa pantalla |
| CA-01.12 | HU-01 | ✅ pasa | ✅ [api] CA-01.12 la API sin sesión responde 401 y no entrega datos<br>✅ [api] CA-01.12 una cookie de sesión inventada no da acceso |
| CA-01.13 | HU-01 | ✅ pasa | ✅ [api] CA-01.13 los ingresos quedan auditados como LOGIN_OK y LOGIN_FALLIDO |
| CA-02.1 | HU-02 | ✅ pasa | ✅ [api] CA-02.1 cerrar sesión responde el mensaje de confirmación<br>✅ [ui] CA-02.1 cerrar sesión vuelve al login con el mensaje de confirmación |
| CA-02.2 | HU-02 | ✅ pasa | ✅ [ui] CA-02.2 tras cerrar sesión, «Atrás» no muestra la pantalla anterior |
| CA-02.3 | HU-02 | ✅ pasa | ✅ [api] CA-02.3 reutilizar la cookie de una sesión cerrada responde 401 |
| CA-02.4 | HU-02 | ✅ pasa | ✅ [api] CA-02.4 el cierre de sesión queda auditado como LOGOUT |
| CA-03.1 | HU-03 | ✅ pasa | ✅ [ui] CA-03.1 el Operador solo ve «Equipos» en el menú |
| CA-03.2 | HU-03 | ✅ pasa | ✅ [ui] CA-03.2 en la ficha, el Operador no ve «Dar de baja» y el selector no ofrece «Baja» |
| CA-03.3 | HU-03 | ✅ pasa | ✅ [api] CA-03.3 el Operador que abre /usuarios, /categorias o /auditoria recibe 403<br>✅ [ui] CA-03.3 el Operador que escribe /usuarios ve «Acceso denegado» sin datos<br>✅ [ui] CA-03.3 el Operador que escribe /categorias ve «Acceso denegado» sin datos<br>✅ [ui] CA-03.3 el Operador que escribe /auditoria ve «Acceso denegado» sin datos |
| CA-03.4 | HU-03 | ✅ pasa | ✅ [api] CA-03.4 el Operador no puede crear usuarios por API y los datos no cambian<br>✅ [api] CA-03.4 el Operador no puede eliminar categorías por API<br>✅ [api] CA-03.4 el Operador no puede dar de baja por API y el equipo no cambia<br>✅ [api] CA-03.4 el Operador no puede consultar usuarios ni auditoría por API |
| CA-03.5 | HU-03 | ✅ pasa | ✅ [api] CA-03.5 cada rechazo queda auditado como ACCESO_DENEGADO con usuario y operación |
| CA-03.6 | HU-03 | ✅ pasa | ✅ [api] CA-03.6 el Administrador accede a todas las secciones<br>✅ [ui] CA-03.6 el Administrador puede abrir todas las secciones |
| CA-03.7 | HU-03 | ✅ pasa | ✅ [api] CA-03.7 un cambio de rol aplica en la siguiente operación sin volver a iniciar sesión<br>✅ [api] CA-11.6 / CA-03.7 un Operador promovido a Administrador accede de inmediato |
| CA-04.1 | HU-04 | ✅ pasa | ✅ [api] CA-04.1 un alta válida crea el equipo en estado Disponible con el mensaje del código<br>✅ [ui] CA-04.1 un alta válida abre la ficha con el mensaje del código y estado Disponible |
| CA-04.2 | HU-04 | ✅ pasa | ✅ [api] CA-04.2 obligatorios vacíos o con solo espacios: no se crea y cada campo informa su error<br>✅ [ui] CA-04.2 obligatorios vacíos o con espacios muestran un mensaje en cada campo |
| CA-04.3 | HU-04 | ✅ pasa | ✅ [api] CA-04.3 número de serie duplicado sin distinguir mayúsculas ni espacios («pf3abc01»)<br>✅ [api] CA-04.3 número de serie duplicado sin distinguir mayúsculas ni espacios («  PF3ABC01  »)<br>✅ [api] CA-04.3 número de serie duplicado sin distinguir mayúsculas ni espacios («Pf3AbC01»)<br>✅ [ui] CA-04.3 una serie duplicada muestra el mensaje con el código existente |
| CA-04.4 | HU-04 | ✅ pasa | ✅ [api] CA-04.4 / CA-09.8 la serie de un equipo dado de baja sigue bloqueada |
| CA-04.5 | HU-04 | ✅ pasa | ✅ [api] CA-04.5 el alta solo ofrece categorías activas<br>✅ [ui] CA-04.5 la lista de categorías del alta solo muestra las activas |
| CA-04.6 | HU-04 | ✅ pasa | ✅ [api] CA-04.6 una categoría desactivada se rechaza por API con error en el campo categoría<br>✅ [api] CA-04.6 una categoría inexistente se rechaza con error en el campo categoría |
| CA-04.7 | HU-04 | ✅ pasa | ✅ [api] CA-04.7 marca: 50 caracteres se acepta y 51 se rechaza indicando el límite<br>✅ [api] CA-04.7 modelo: 80 caracteres se acepta y 81 se rechaza indicando el límite<br>✅ [api] CA-04.7 numero_serie: 50 caracteres se acepta y 51 se rechaza indicando el límite<br>✅ [api] CA-04.7 observaciones: 500 caracteres se acepta y 501 se rechaza indicando el límite<br>✅ [ui] CA-04.7 los campos limitan la longitud máxima en el formulario |
| CA-04.8 | HU-04 | ✅ pasa | ✅ [api] CA-04.8 los espacios al inicio y al final no se guardan |
| CA-04.9 | HU-04 | ✅ pasa | ✅ [api] CA-04.9 el alta registra el historial «— → Disponible» y la auditoría ALTA con los datos |
| CA-04.10 | HU-04 | ✅ pasa | ✅ [api] CA-04.10 el texto con HTML se guarda literal (la no ejecución se prueba en la interfaz)<br>✅ [ui] CA-04.10 texto con HTML/JS se muestra literal y nunca se ejecuta (listado y ficha) |
| CA-13.1 | HU-13 | ✅ pasa | ✅ [api] CA-13.1 con el último código EQ-000012, el alta siguiente recibe EQ-000013 |
| CA-13.2 | HU-13 | ✅ pasa | ✅ [api] CA-13.2 un alta rechazada no consume número |
| CA-13.3 | HU-13 | ✅ pasa | ✅ [api] CA-13.3 el código de un equipo dado de baja (EQ-000011) no se reutiliza |
| CA-13.4 | HU-13 | ✅ pasa | ✅ [api] CA-13.4 / CA-13.6 un código o estado enviados por el cliente se ignoran<br>✅ [ui] CA-05.2 / CA-13.4 código y estado se muestran deshabilitados |
| CA-13.5 | HU-13 | ✅ pasa | ✅ [api] CA-13.5 altas simultáneas reciben códigos distintos y correlativos |
| CA-13.6 | HU-13 | ✅ pasa | ✅ [api] CA-13.4 / CA-13.6 un código o estado enviados por el cliente se ignoran |
| CA-05.1 | HU-05 | ✅ pasa | ✅ [api] CA-05.1 se edita el modelo de un equipo Disponible<br>✅ [api] CA-05.1 se edita el modelo de un equipo Asignado<br>✅ [api] CA-05.1 se edita el modelo de un equipo En reparación<br>✅ [ui] CA-05.1 editar el modelo vuelve a la ficha con el mensaje y el dato actualizado |
| CA-05.2 | HU-05 | ✅ pasa | ✅ [ui] CA-05.2 / CA-13.4 código y estado se muestran deshabilitados |
| CA-05.3 | HU-05 | ✅ pasa | ✅ [api] CA-05.3 cambiar la serie a una existente (otra capitalización) se rechaza y no guarda nada<br>✅ [api] CA-05.3 cambiar solo la capitalización de la propia serie se permite |
| CA-05.4 | HU-05 | ✅ pasa | ✅ [api] CA-05.4 vaciar un obligatorio se rechaza indicando el campo<br>✅ [ui] CA-05.4 vaciar un obligatorio muestra el error del campo |
| CA-05.5 | HU-05 | ✅ pasa | ✅ [ui] CA-05.5 / CA-09.6 la ficha de un equipo en Baja no ofrece editar, cambiar estado ni dar de baja |
| CA-05.6 | HU-05 | ✅ pasa | ✅ [api] CA-05.6 un equipo dado de baja no admite edición por API<br>✅ [ui] CA-05.6 abrir la edición de un equipo en Baja por URL muestra el rechazo |
| CA-05.7 | HU-05 | ✅ pasa | ✅ [api] CA-05.7 guardar sin cambios informa y no genera auditoría<br>✅ [api] CA-05.7 agregar solo espacios a un campo no cuenta como cambio<br>✅ [ui] CA-05.7 guardar sin cambios informa que no hay cambios |
| CA-05.8 | HU-05 | ✅ pasa | ✅ [api] CA-05.8 un equipo con categoría desactivada la conserva al editar otros campos<br>✅ [ui] CA-05.8 un equipo con categoría desactivada la conserva al editar |
| CA-05.9 | HU-05 | ✅ pasa | ✅ [api] CA-05.9 la auditoría MODIFICACION guarda anterior → nuevo de cada campo cambiado |
| CA-06.1 | HU-06 | ✅ pasa | ✅ [api] CA-06.1 la ficha incluye todos los datos enumerados<br>✅ [ui] CA-06.1 hacer clic en el código del listado abre la ficha con todos los datos |
| CA-06.2 | HU-06 | ✅ pasa | ✅ [api] CA-06.2 el historial va del más reciente al más antiguo y la fecha del último cambio coincide con la primera fila<br>✅ [api] CA-06.2 tras un cambio de estado, la fecha del último cambio sigue a la primera fila<br>✅ [ui] CA-06.2 / CA-06.3 historial del más reciente al más antiguo, terminando en el alta |
| CA-06.3 | HU-06 | ✅ pasa | ✅ [api] CA-06.3 la primera entrada de cada historial es el alta<br>✅ [ui] CA-06.2 / CA-06.3 historial del más reciente al más antiguo, terminando en el alta |
| CA-06.4 | HU-06 | ❌ falla | ✅ [api] CA-06.4 un código inexistente responde 404 con el mensaje de no encontrado<br>❌ [ui] CA-06.4 /equipos/EQ-999999 muestra «no encontrado» (HTTP 404) sin errores técnicos |
| CA-06.5 | HU-06 | ✅ pasa | ✅ [api] CA-06.5 las fechas usan dd/mm/aaaa hh:mm:ss en hora de Argentina |
| CA-06.6 | HU-06 | ✅ pasa | ✅ [api] CA-06.6 una categoría desactivada se marca en la ficha<br>✅ [ui] CA-06.6 una categoría desactivada se indica con «(desactivada)» |
| CA-07.1 | HU-07 | ✅ pasa | ✅ [api] CA-07.1 «thinkpad» encuentra ThinkPad T14 y ThinkPad T460 |
| CA-07.2 | HU-07 | ✅ pasa | ✅ [api] CA-07.2 «000007» encuentra EQ-000007 |
| CA-07.3 | HU-07 | ✅ pasa | ✅ [api] CA-07.3 «pf3abc» encuentra la serie PF3ABC01 |
| CA-07.4 | HU-07 | ✅ pasa | ✅ [api] CA-07.4 texto + categoría + estado se combinan<br>✅ [ui] CA-07.4 / CA-07.8 texto, categoría y estado se combinan y se muestran como etiquetas |
| CA-07.5 | HU-07 | ✅ pasa | ✅ [api] CA-07.5 el listado inicial no incluye equipos dados de baja<br>✅ [ui] CA-07.5 el listado inicial no muestra equipos en Baja |
| CA-07.6 | HU-07 | ✅ pasa | ✅ [api] CA-07.6 con «Incluir dados de baja» o con el estado «Baja» aparecen las bajas<br>✅ [ui] CA-07.6 «Incluir dados de baja» muestra las bajas |
| CA-07.7 | HU-07 | ✅ pasa | ✅ [api] CA-07.7 una búsqueda sin coincidencias devuelve cero resultados<br>✅ [ui] CA-07.7 sin coincidencias se muestra el mensaje y no la tabla |
| CA-07.8 | HU-07 | ✅ pasa | ✅ [ui] CA-07.4 / CA-07.8 texto, categoría y estado se combinan y se muestran como etiquetas |
| CA-07.9 | HU-07 | ✅ pasa | ✅ [ui] CA-07.9 «Limpiar filtros» vacía todo con una sola acción |
| CA-07.10 | HU-07 | ✅ pasa | ✅ [api] CA-07.10 / CA-07.11 con 50 resultados no se pagina; con 51 se pagina de a 50<br>✅ [ui] CA-07.10 / CA-07.11 paginación: con 51 resultados, 50 por página con «Página X de Y» |
| CA-07.11 | HU-07 | ✅ pasa | ✅ [api] CA-07.10 / CA-07.11 con 50 resultados no se pagina; con 51 se pagina de a 50<br>✅ [ui] CA-07.10 / CA-07.11 paginación: con 51 resultados, 50 por página con «Página X de Y» |
| CA-07.12 | HU-07 | ✅ pasa | ✅ [api] CA-07.12 «%» y «_» se interpretan literalmente |
| CA-08.1 | HU-08 | ✅ pasa | ✅ [api] CA-08.1 / CA-08.2 / CA-08.3 las transiciones ofrecidas al Operador según el estado<br>✅ [ui] CA-08.1 / CA-08.2 / CA-08.3 el selector solo ofrece estados alcanzables |
| CA-08.2 | HU-08 | ✅ pasa | ✅ [api] CA-08.1 / CA-08.2 / CA-08.3 las transiciones ofrecidas al Operador según el estado<br>✅ [ui] CA-08.1 / CA-08.2 / CA-08.3 el selector solo ofrece estados alcanzables |
| CA-08.3 | HU-08 | ✅ pasa | ✅ [api] CA-08.1 / CA-08.2 / CA-08.3 las transiciones ofrecidas al Operador según el estado<br>✅ [ui] CA-08.1 / CA-08.2 / CA-08.3 el selector solo ofrece estados alcanzables |
| CA-08.4 | HU-08 | ✅ pasa | ✅ [api] CA-08.4 Disponible → Asignado con motivo válido suma una fila al tope del historial<br>✅ [ui] CA-08.4 Disponible → Asignado: mensaje de éxito y nueva fila al tope del historial |
| CA-08.5 | HU-08 | ✅ pasa | ✅ [api] CA-08.5 motivo de 9 caracteres: se rechaza y el estado no cambia<br>✅ [api] CA-08.5 motivo de solo espacios: se rechaza y el estado no cambia<br>✅ [api] CA-08.5 motivo de 9 caracteres con espacios alrededor: se rechaza y el estado no cambia<br>✅ [api] CA-08.5 motivo de 501 caracteres: se rechaza y el estado no cambia<br>✅ [api] CA-08.5 motivo de vacío: se rechaza y el estado no cambia<br>✅ [ui] CA-08.5 un motivo corto muestra el error y el estado no cambia |
| CA-08.6 | HU-08 | ✅ pasa | ✅ [api] CA-08.6 motivo de exactamente 10 y exactamente 500 caracteres se acepta |
| CA-08.7 | HU-08 | ✅ pasa | ✅ [api] CA-08.7 transiciones no permitidas: Asignado → Asignado y En reparación → Asignado (422) |
| CA-08.8 | HU-08 | ❌ falla | ✅ [api] CA-08.8 un equipo en Baja no admite pasar a Disponible<br>✅ [api] CA-08.8 un equipo en Baja no admite pasar a Asignado<br>✅ [api] CA-08.8 un equipo en Baja no admite pasar a En reparación<br>❌ [api] CA-08.8 forzado por API sin enviar la versión también se rechaza con el mensaje de baja |
| CA-08.9 | HU-08 | ✅ pasa | ✅ [api] CA-08.9 dos usuarios con la misma ficha: se aplica el primero y el segundo recibe conflicto<br>✅ [api] CA-08.9 confirmaciones realmente simultáneas: solo una se aplica<br>✅ [ui] CA-08.9 dos usuarios con la ficha abierta: el segundo ve el conflicto y «Recargar ficha» |
| CA-08.10 | HU-08 | ✅ pasa | ✅ [api] CA-08.10 el cambio queda en auditoría CAMBIO_ESTADO con anterior, nuevo y motivo |
| CA-09.1 | HU-09 | ✅ pasa | ✅ [api] CA-09.1 el Administrador da de baja un equipo Disponible<br>✅ [api] CA-09.1 el Administrador da de baja un equipo En reparación<br>✅ [ui] CA-09.1 baja confirmada: estado Baja y mensaje<br>✅ [ui] CA-09.1 el Administrador puede dar de baja un equipo En reparación |
| CA-09.2 | HU-09 | ✅ pasa | ✅ [ui] CA-09.2 «Cancelar» en el diálogo no produce cambios |
| CA-09.3 | HU-09 | ✅ pasa | ✅ [ui] CA-09.3 en un equipo Asignado, «Dar de baja» está deshabilitado con el aviso |
| CA-09.4 | HU-09 | ✅ pasa | ✅ [api] CA-09.4 dar de baja un equipo Asignado por API se rechaza con 422<br>✅ [api] CA-09.4 el motivo también es obligatorio en la baja |
| CA-09.5 | HU-09 | ✅ pasa | ✅ [api] CA-09.5 el Operador recibe 403, el equipo no cambia y queda auditado |
| CA-09.6 | HU-09 | ✅ pasa | ✅ [api] CA-09.6 un equipo dado de baja conserva su historial y no ofrece acciones<br>✅ [ui] CA-05.5 / CA-09.6 la ficha de un equipo en Baja no ofrece editar, cambiar estado ni dar de baja |
| CA-09.7 | HU-09 | ✅ pasa | ✅ [api] CA-09.7 la baja no aparece en el listado por defecto, sí con «Incluir dados de baja» |
| CA-09.8 | HU-09 | ✅ pasa | ✅ [api] CA-04.4 / CA-09.8 la serie de un equipo dado de baja sigue bloqueada |
| CA-09.9 | HU-09 | ✅ pasa | ✅ [api] CA-09.9 la baja queda auditada como BAJA con usuario y motivo |
| CA-10.1 | HU-10 | ✅ pasa | ✅ [api] CA-10.1 crear «Servidor»: activa, 0 equipos y disponible para el alta<br>✅ [ui] CA-10.1 crear «Servidor»: aparece activa, con 0 equipos, y se ofrece en el alta |
| CA-10.2 | HU-10 | ✅ pasa | ✅ [api] CA-10.2 crear «notebook» se rechaza por nombre repetido<br>✅ [api] CA-10.2 renombrar otra categoría a «NOTEBOOK» se rechaza<br>✅ [ui] CA-10.2 / CA-10.3 nombre repetido o de 1 carácter muestra el error |
| CA-10.3 | HU-10 | ✅ pasa | ✅ [api] CA-10.3 nombre vacío: se rechaza indicando el campo<br>✅ [api] CA-10.3 nombre solo espacios: se rechaza indicando el campo<br>✅ [api] CA-10.3 nombre 1 carácter: se rechaza indicando el campo<br>✅ [api] CA-10.3 nombre 51 caracteres: se rechaza indicando el campo<br>✅ [api] CA-10.3 nombres de 2 y de 50 caracteres se aceptan (valores límite)<br>✅ [ui] CA-10.2 / CA-10.3 nombre repetido o de 1 carácter muestra el error |
| CA-10.4 | HU-10 | ✅ pasa | ✅ [api] CA-10.4 renombrar una categoría con equipos se refleja en ficha y listado<br>✅ [ui] CA-10.4 renombrar se refleja en el listado de equipos |
| CA-10.5 | HU-10 | ✅ pasa | ✅ [api] CA-10.5 desactivar: deja de ofrecerse en el alta y los equipos la muestran como desactivada; se puede reactivar<br>✅ [ui] CA-10.5 desactivar pide confirmación y la categoría deja de ofrecerse en el alta |
| CA-10.6 | HU-10 | ✅ pasa | ✅ [api] CA-10.6 eliminar una categoría con equipos se rechaza con el mensaje esperado<br>✅ [api] CA-10.6 una categoría cuyos únicos equipos están dados de baja tampoco se elimina<br>✅ [ui] CA-10.6 eliminar una categoría con equipos muestra el rechazo |
| CA-10.7 | HU-10 | ✅ pasa | ✅ [api] CA-10.7 una categoría sin equipos se elimina y desaparece de la lista<br>✅ [ui] CA-10.7 una categoría sin equipos se elimina tras confirmar |
| CA-10.8 | HU-10 | ✅ pasa | ✅ [api] CA-10.8 el Operador recibe 403 en todas las operaciones de categorías |
| CA-10.9 | HU-10 | ✅ pasa | ✅ [api] CA-10.9 las operaciones de categorías quedan auditadas con entidad CATEGORIA |
| CA-11.1 | HU-11 | ✅ pasa | ✅ [api] CA-11.1 crear un Operador con «abcdefg1»: aparece activo y puede ingresar<br>✅ [ui] CA-11.1 crear un Operador: aparece activo y puede iniciar sesión |
| CA-11.2 | HU-11 | ✅ pasa | ✅ [api] CA-11.2 «TECNICO1» se rechaza por usuario repetido |
| CA-11.3 | HU-11 | ✅ pasa | ✅ [api] CA-11.3 contraseña «abc1234» se rechaza indicando la regla<br>✅ [api] CA-11.3 contraseña «abcdefgh» se rechaza indicando la regla<br>✅ [api] CA-11.3 contraseña «12345678» se rechaza indicando la regla<br>✅ [api] CA-11.3 contraseña «» se rechaza indicando la regla<br>✅ [ui] CA-11.3 / CA-11.4 los errores se indican junto a cada campo |
| CA-11.4 | HU-11 | ✅ pasa | ✅ [api] CA-11.4 usuario con espacios: se rechaza indicando el campo<br>✅ [api] CA-11.4 usuario de 2 caracteres: se rechaza indicando el campo<br>✅ [api] CA-11.4 usuario de 31 caracteres: se rechaza indicando el campo<br>✅ [api] CA-11.4 usuario sin rol: se rechaza indicando el campo<br>✅ [api] CA-11.4 usuario con rol inventado: se rechaza indicando el campo<br>✅ [api] CA-11.4 usuario sin nombre: se rechaza indicando el campo<br>✅ [api] CA-11.4 usuarios de 3 y 30 caracteres con punto, guion y guion bajo se aceptan<br>✅ [ui] CA-11.3 / CA-11.4 los errores se indican junto a cada campo |
| CA-11.5 | HU-11 | ✅ pasa | ✅ [api] CA-11.5 ni la lista ni las respuestas exponen la contraseña ni su hash<br>✅ [ui] CA-11.5 la lista de usuarios no muestra contraseñas |
| CA-11.6 | HU-11 | ✅ pasa | ✅ [api] CA-11.6 / CA-03.7 un Operador promovido a Administrador accede de inmediato |
| CA-11.7 | HU-11 | ✅ pasa | ✅ [api] CA-11.7 desactivar a un usuario con sesión abierta lo saca de inmediato y no puede volver a ingresar<br>✅ [ui] CA-11.7 desactivar pide confirmación y el usuario afectado vuelve al login en su siguiente acción |
| CA-11.8 | HU-11 | ✅ pasa | ✅ [api] CA-11.8 los registros de un usuario desactivado siguen en la auditoría |
| CA-11.9 | HU-11 | ✅ pasa | ✅ [api] CA-11.9 el único Administrador activo no puede desactivarse<br>✅ [api] CA-11.9 con otro Administrador activo, el mensaje es «No podés desactivar tu propio usuario.»<br>✅ [ui] CA-11.9 el Administrador no puede desactivarse a sí mismo |
| CA-11.10 | HU-11 | ✅ pasa | ✅ [api] CA-11.10 el Administrador no puede cambiar su propio rol<br>✅ [ui] CA-11.10 el Administrador no puede cambiar su propio rol |
| CA-11.11 | HU-11 | ✅ pasa | ✅ [api] CA-11.11 con una nueva contraseña el usuario ingresa con la nueva y no con la anterior<br>✅ [api] CA-11.11 una nueva contraseña inválida se rechaza |
| CA-11.12 | HU-11 | ✅ pasa | ✅ [api] CA-11.12 las operaciones sobre usuarios se auditan y la contraseña figura como «(oculta)» |
| CA-12.1 | HU-12 | ✅ pasa | ✅ [api] CA-12.1 los registros van del más reciente al más antiguo con fecha dd/mm/aaaa hh:mm:ss<br>✅ [ui] CA-12.1 / CA-12.9 la tabla muestra las columnas pedidas y no ofrece editar ni eliminar |
| CA-12.2 | HU-12 | ✅ pasa | ✅ [ui] CA-12.2 una edición muestra «campo: anterior → nuevo» |
| CA-12.3 | HU-12 | ✅ pasa | ✅ [api] CA-12.3 un login fallido con «noexiste» aparece con el nombre ingresado |
| CA-12.4 | HU-12 | ✅ pasa | ✅ [api] CA-12.4 un rechazo por permisos aparece con el usuario y la operación |
| CA-12.5 | HU-12 | ✅ pasa | ✅ [api] CA-12.5 filtrar Desde 01/09/2026 Hasta 01/09/2026 trae solo ese día (extremos inclusivos)<br>✅ [ui] CA-12.5 filtrar un solo día trae solo registros de ese día |
| CA-12.6 | HU-12 | ❌ falla | ✅ [api] CA-12.6 «Desde» posterior a «Hasta» informa rango inválido<br>❌ [api] CA-12.6 una fecha mal formada se rechaza sin error técnico<br>✅ [ui] CA-12.6 «Desde» posterior a «Hasta» informa que el rango no es válido |
| CA-12.7 | HU-12 | ✅ pasa | ✅ [api] CA-12.7 usuario admin + acción BAJA + entidad EQUIPO se combinan |
| CA-12.8 | HU-12 | ✅ pasa | ✅ [api] CA-12.8 filtros sin coincidencias devuelven 0 registros<br>✅ [ui] CA-12.8 filtros sin coincidencias muestran el mensaje |
| CA-12.9 | HU-12 | ✅ pasa | ✅ [ui] CA-12.1 / CA-12.9 la tabla muestra las columnas pedidas y no ofrece editar ni eliminar |
| CA-12.10 | HU-12 | ✅ pasa | ✅ [api] CA-12.10 PUT, PATCH y DELETE sobre la auditoría responden 405 y el registro no cambia |
| CA-12.11 | HU-12 | ✅ pasa | ✅ [api] CA-12.11 el Operador no accede a la auditoría por API ni por URL |
| CA-12.12 | HU-12 | ✅ pasa | ✅ [api] CA-12.12 con más de 50 registros se pagina de a 50<br>✅ [ui] CA-12.12 con más de 50 registros se pagina de a 50 |

## Casos adicionales (robustez y seguridad, sin CA propio)

| Resultado | Proyecto | Caso |
|---|---|---|
| ❌ | api | Robustez: un nombre de usuario muy largo se rechaza con el mensaje genérico, sin error 500 |
| ✅ | api | Robustez: un cuerpo JSON mal formado responde 400 sin detalles técnicos |
| ✅ | api | Las pantallas internas se sirven sin caché (el botón Atrás no las muestra tras cerrar sesión) |
| ❌ | api | Robustez: un id de categoría no numérico responde 404, sin error 500 |
| ❌ | api | Seguridad: una contraseña de más de 72 bytes no admite ingresar con solo su comienzo |
| ❌ | api | Robustez: un id de usuario no numérico responde 404, sin error 500 |
| ❌ | api | Robustez: un id de categoría fuera de rango se rechaza como dato inválido, sin error 500 |
| ✅ | api | HU-05 regla: no se puede pasar un equipo a otra categoría desactivada |
| ✅ | api | Editar un código inexistente responde 404 |
| ✅ | api | HU-06 la ficha ofrece solo acciones válidas para el estado y el rol |
| ✅ | api | HU-07 la búsqueda ignora espacios al inicio y al final |
| ✅ | api | HU-07 un estado o categoría inválidos en la URL se rechazan sin error técnico |
| ❌ | api | Robustez: un id de categoría fuera de rango en el filtro no produce error 500 |
| ✅ | api | HU-08 un estado inexistente se rechaza con 400 |
| ✅ | ui | Seguridad: «volver=//evil.example» en el login no redirige a un sitio externo |
| ❌ | ui | Seguridad: «volver=/\evil.example» en el login no redirige a un sitio externo |
| ❌ | ui | Seguridad: «volver=/\/evil.example» en el login no redirige a un sitio externo |
| ✅ | ui | Seguridad: «volver=https://evil.example» en el login no redirige a un sitio externo |
