# GestIT · Historias de usuario V1 con criterios de aceptación

**TPO Testing de Aplicaciones · Grupo 12**

Alcance: versión 1 (núcleo). Cada historia indica los requerimientos funcionales (RF) que la respaldan, su prioridad y sus criterios de aceptación (CA). Los CA usan el formato *Dado / Cuando / Entonces* y cada uno puede convertirse directamente en uno o más casos de prueba.

## Convenciones

- **Roles.** **Administrador** puede hacer todo. **Operador** opera el inventario (alta, edición, consulta, búsqueda y cambios de estado) pero no puede:
  - dar de baja equipos
  - administrar categorías
  - administrar usuarios
  - consultar la auditoría
- **Estados del equipo:**
  - Disponible
  - Asignado
  - En reparación
  - Baja
- **Código interno:** formato `EQ-000001`, con 6 dígitos y correlativo.
- **Fechas:** se muestran como `dd/mm/aaaa hh:mm:ss`, hora de Argentina.
- **Mensajes:** todos están en español, indican el campo afectado y nunca muestran detalles técnicos (RNF-02).
- **Usuarios de prueba** (datos semilla):

  | Usuario | Contraseña | Rol / situación |
  |---|---|---|
  | `admin` | `Admin1234` | Administrador |
  | `operador` | `Operador1234` | Operador |
  | `operador2` | `Operador1234` | Operador |
  | `inactivo` | `Inactivo1234` | Operador desactivado |

## Mapa de trazabilidad

| HU | Título | Rol | RF | Prioridad |
|---|---|---|---|---|
| HU-01 | Iniciar sesión | Todos | RF-01 | Alta |
| HU-02 | Cerrar sesión | Todos | RF-01 | Alta |
| HU-03 | Restringir funciones según el rol | Administrador | RF-01, RF-02 | Alta |
| HU-04 | Registrar un equipo | Operador | RF-03 | Alta |
| HU-05 | Editar los datos de un equipo | Operador | RF-03 | Media |
| HU-06 | Consultar la ficha de un equipo | Operador | RF-04 | Media |
| HU-07 | Buscar y filtrar equipos | Operador | RF-06 | Media |
| HU-08 | Cambiar el estado de un equipo | Operador | RF-05 | Alta |
| HU-09 | Dar de baja un equipo | Administrador | RF-05 | Alta |
| HU-10 | Administrar categorías de equipos | Administrador | RF-06 | Media |
| HU-11 | Administrar usuarios del sistema | Administrador | RF-02 | Alta |
| HU-12 | Consultar el registro de auditoría | Administrador | RF-07 | Alta |
| HU-13 | Generar el código de inventario | Operador | RF-03 | Alta |

---

## Módulo: Acceso y seguridad

### HU-01 · Iniciar sesión

**Como** usuario del sistema (Administrador u Operador), **quiero** autenticarme con mi usuario y mi contraseña, **para** acceder únicamente a las funciones que corresponden a mi rol y que nadie sin credenciales válidas pueda operar el inventario.

**RF:** RF-01 · **Prioridad:** Alta

**Reglas de negocio**
- Solo ingresan los usuarios **activos** con credenciales correctas.
- El usuario se reconoce sin distinguir mayúsculas.
- Ante cualquier rechazo de credenciales el mensaje es siempre el mismo: «Usuario o contraseña incorrectos.». Aplica a usuario inexistente, contraseña incorrecta o usuario desactivado, para no revelar qué usuarios existen.
- **5 intentos fallidos consecutivos** sobre un mismo nombre de usuario lo bloquean durante **15 minutos**. Durante el bloqueo se rechaza incluso la contraseña correcta.
- El contador de intentos se reinicia con un ingreso exitoso o al vencer el bloqueo.
- La sesión **expira tras 30 minutos sin actividad**. Cada operación renueva el plazo.
- Toda pantalla interna exige sesión. Sin sesión, redirige al login.

**Criterios de aceptación**

| CA | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-01.1 | Un usuario activo con credenciales válidas | Ingresa usuario y contraseña y presiona «Ingresar» | Accede al inventario de equipos. Ve su nombre y su rol en la barra superior y el menú muestra solo las opciones de su rol. |
| CA-01.2 | Un usuario existente | Ingresa una contraseña incorrecta | Ve «Usuario o contraseña incorrectos.», sigue en el login y el campo contraseña se vacía. |
| CA-01.3 | Un nombre de usuario que no existe | Intenta ingresar | Ve exactamente el mismo mensaje que en CA-01.2. |
| CA-01.4 | Un usuario desactivado con su contraseña correcta | Intenta ingresar | Ve exactamente el mismo mensaje que en CA-01.2 y no accede. |
| CA-01.5 | El formulario de login | Deja vacío el usuario, la contraseña o ambos | Se indica junto a cada campo que es obligatorio y no se cuenta como intento fallido. |
| CA-01.6 | Un usuario con 4 intentos fallidos consecutivos | Falla por quinta vez | Ve un mensaje que informa el bloqueo por 15 minutos. |
| CA-01.7 | Un usuario bloqueado | Ingresa la contraseña correcta antes de los 15 minutos | Sigue bloqueado y no accede. |
| CA-01.8 | Un usuario bloqueado | Transcurren 15 minutos e ingresa la contraseña correcta | Accede normalmente. |
| CA-01.9 | Un usuario con 4 intentos fallidos | Ingresa correctamente | El contador vuelve a cero: 4 nuevos fallos posteriores no lo bloquean. |
| CA-01.10 | Una sesión activa | Pasan 30 minutos sin actividad y el usuario intenta cualquier acción | Es redirigido al login con el mensaje «Tu sesión expiró por inactividad». |
| CA-01.11 | Un visitante sin sesión | Escribe en el navegador la URL de una pantalla interna (p. ej. `/equipos/EQ-000003`) | Es redirigido al login y, tras ingresar, vuelve a la pantalla que pidió. |
| CA-01.12 | Un visitante sin sesión | Invoca directamente la API (p. ej. `GET /api/equipos`) | Recibe HTTP 401 y no obtiene datos. |
| CA-01.13 | Cualquier intento de ingreso | Finaliza, con éxito o con fallo | Queda en auditoría como `LOGIN_OK` o `LOGIN_FALLIDO` (ver HU-12). |

**Fuera de alcance V1:** recuperación de contraseña por correo y autenticación de dos factores.

---

### HU-02 · Cerrar sesión

**Como** usuario del sistema, **quiero** cerrar mi sesión de forma explícita, **para** evitar que otra persona use mi acceso cuando dejo un equipo compartido.

**RF:** RF-01 · **Prioridad:** Alta

**Reglas de negocio**
- Cerrar sesión invalida la sesión **en el servidor**, no solo en el navegador.
- Después de cerrar sesión, ninguna pantalla interna vuelve a mostrarse sin un nuevo login, tampoco con el botón «Atrás».

**Criterios de aceptación**

| CA | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-02.1 | Un usuario con sesión activa | Presiona «Cerrar sesión» | Vuelve al login con el mensaje «Cerraste sesión correctamente.». |
| CA-02.2 | Un usuario que acaba de cerrar sesión | Presiona «Atrás» en el navegador | No ve la pantalla anterior: es redirigido al login. |
| CA-02.3 | La sesión cerrada | Se reutiliza su identificador (cookie) en una llamada a la API | El servidor responde 401: la sesión ya no es válida. |
| CA-02.4 | Un cierre de sesión | Se completa | Queda registrado en auditoría como `LOGOUT`. |

---

### HU-03 · Restringir funciones según el rol

**Como** Administrador, **quiero** que el Operador no pueda acceder a las funciones críticas, **para** proteger la integridad del inventario, de los usuarios y de la configuración aunque alguien intente saltear la interfaz.

**RF:** RF-01, RF-02 · **Prioridad:** Alta

**Reglas de negocio**
- Funciones exclusivas del Administrador:
  - dar de baja equipos
  - administrar categorías
  - administrar usuarios
  - consultar la auditoría
- Ocultar una opción del menú **no reemplaza** la validación: el servidor controla el rol en cada operación.
- Todo rechazo por permisos queda registrado en auditoría (`ACCESO_DENEGADO`).

**Criterios de aceptación**

| CA | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-03.1 | Un Operador con sesión | Mira el menú | Solo ve «Equipos». No ve «Categorías», «Usuarios» ni «Auditoría». |
| CA-03.2 | Un Operador en la ficha de un equipo | La consulta | No ve el botón «Dar de baja» y el selector de nuevo estado no ofrece «Baja». |
| CA-03.3 | Un Operador | Escribe en el navegador `/usuarios`, `/categorias` o `/auditoria` | Ve la pantalla «Acceso denegado» (HTTP 403) sin datos de la sección. |
| CA-03.4 | Un Operador | Invoca por API una función de Administrador (p. ej. `POST /api/usuarios`, `DELETE /api/categorias/1`, o un cambio de estado a «Baja») | Recibe HTTP 403, la operación **no se ejecuta** y los datos quedan iguales. |
| CA-03.5 | Cualquier rechazo de CA-03.3 o CA-03.4 | Se produce | Queda en auditoría como `ACCESO_DENEGADO`, con usuario, operación intentada y fecha-hora. |
| CA-03.6 | Un Administrador | Navega por el sistema | Ve y puede usar todas las secciones. |
| CA-03.7 | Un usuario al que se le cambió el rol | Hace su siguiente operación | Los permisos aplican el nuevo rol de inmediato, sin volver a iniciar sesión. |

---

## Módulo: Gestión de equipos

### HU-04 · Registrar un equipo

**Como** Operador, **quiero** dar de alta un equipo con sus datos identificatorios, **para** incorporarlo al inventario y poder seguir su situación desde ese momento.

**RF:** RF-03 · **Prioridad:** Alta

**Reglas de negocio**
- Campos obligatorios y longitud máxima:

  | Campo | Obligatorio | Máximo |
  |---|---|---|
  | Marca | Sí | 50 caracteres |
  | Modelo | Sí | 80 caracteres |
  | Número de serie | Sí | 50 caracteres |
  | Categoría | Sí | solo categorías activas |
  | Observaciones | No | 500 caracteres |

- Se eliminan los espacios al inicio y al final. Un campo con solo espacios se considera vacío.
- El **número de serie es único en todo el inventario**, incluidos los equipos dados de baja. La comparación ignora mayúsculas y los espacios al inicio y al final.
- Todo equipo nuevo se crea en estado **Disponible**. El código lo asigna el sistema (HU-13).
- El alta registra la primera entrada del historial: «— → Disponible».

**Criterios de aceptación**

| CA | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-04.1 | Un Operador en «Registrar equipo» | Completa marca, modelo, número de serie y categoría y presiona «Guardar» | Se crea el equipo y se abre su ficha con el mensaje «Equipo registrado con el código EQ-XXXXXX». El equipo queda en estado Disponible. |
| CA-04.2 | El formulario de alta | Se guarda con uno o más obligatorios vacíos o con solo espacios | No se crea el equipo y cada campo faltante muestra su mensaje (p. ej. «La marca es obligatoria.»). |
| CA-04.3 | Un equipo existente con serie `PF3ABC01` | Se registra otro con `pf3abc01` o `  PF3ABC01  ` | Se rechaza con «Ya existe un equipo con el número de serie … (EQ-000001)». |
| CA-04.4 | Un equipo **dado de baja** con serie `HPEB-840-0011` | Se registra otro con esa serie | Se rechaza igual que en CA-04.3. |
| CA-04.5 | El formulario de alta | Se despliega la lista de categorías | Solo aparecen las categorías **activas**. |
| CA-04.6 | Una categoría desactivada | Se intenta usarla por API | Se rechaza con un mensaje junto al campo categoría. |
| CA-04.7 | Un campo que excede su máximo (p. ej. marca de 51 caracteres u observaciones de 501) | Se intenta guardar | Se rechaza indicando el campo y el límite. |
| CA-04.8 | Datos con espacios al inicio o al final | Se guarda | Se almacenan sin esos espacios. |
| CA-04.9 | Un alta exitosa | Se consulta la ficha y la auditoría | La ficha muestra el historial «— → Disponible» y la auditoría registra `ALTA` con los datos cargados. |
| CA-04.10 | Texto con caracteres especiales o código HTML/JS (p. ej. `<script>`) | Se guarda y luego se visualiza | Se muestra como texto literal y nunca se ejecuta (RNF-04). |

---

### HU-13 · Generar el código de inventario

**Como** Operador, **quiero** que el sistema asigne automáticamente un código único y correlativo a cada equipo, **para** identificarlo de forma inequívoca sin depender de criterios personales ni de datos que pueden cambiar.

**RF:** RF-03 · **Prioridad:** Alta

**Reglas de negocio**
- El formato es `EQ-` seguido de 6 dígitos (`EQ-000001`, `EQ-000002`, …). Es global, no depende de la categoría.
- Se asigna **solo al guardar con éxito**: un alta rechazada no consume número, así que no quedan huecos.
- **No es editable** y los códigos de equipos dados de baja **no se reutilizan**.

**Criterios de aceptación**

| CA | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-13.1 | El último código emitido es EQ-000012 | Se registra un equipo | Recibe EQ-000013. |
| CA-13.2 | Un alta rechazada (p. ej. serie duplicada) | Se registra a continuación un alta válida | Recibe el número siguiente al último emitido, sin saltos. |
| CA-13.3 | Un equipo dado de baja con código EQ-000011 | Se registran nuevos equipos | Ninguno recibe EQ-000011. |
| CA-13.4 | El formulario de edición | Se abre | El código se muestra como solo lectura. Si se lo envía por API, se ignora. |
| CA-13.5 | Varios usuarios | Registran equipos al mismo tiempo | Cada equipo recibe un código distinto y los códigos siguen siendo correlativos. |
| CA-13.6 | Un alta | Se envía por API con un código o un estado elegidos por el cliente | El sistema los ignora: asigna su propio código y el estado Disponible. |

---

### HU-05 · Editar los datos de un equipo

**Como** Operador, **quiero** corregir la información de un equipo ya cargado, **para** mantener el inventario fiel a la realidad cuando detecto un error de carga.

**RF:** RF-03 · **Prioridad:** Media

**Reglas de negocio**
- Se pueden editar marca, modelo, número de serie, categoría y observaciones, con las mismas validaciones que el alta.
- **No se editan** el código interno ni el estado. El estado cambia solo por HU-08 y HU-09.
- Un equipo **dado de baja no admite edición**.
- Si el equipo tiene una categoría desactivada, puede conservarla. No se lo puede pasar a otra categoría desactivada.
- Cada modificación queda en auditoría con el **valor anterior y el nuevo de cada campo cambiado**.

**Criterios de aceptación**

| CA | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-05.1 | Un equipo en estado Disponible, Asignado o En reparación | El Operador modifica el modelo y guarda | Vuelve a la ficha con «Cambios guardados correctamente.» y el dato actualizado. |
| CA-05.2 | La pantalla de edición | Se abre | Código y estado se muestran deshabilitados (solo lectura). |
| CA-05.3 | Otro equipo con serie `PF3ABC01` | Se cambia la serie a `pf3abc01` | Se rechaza por serie duplicada y no se guarda ningún cambio. |
| CA-05.4 | La pantalla de edición | Se vacía un obligatorio y se guarda | Se rechaza indicando el campo. |
| CA-05.5 | Un equipo en estado Baja | Se consulta su ficha | No aparece «Editar datos». |
| CA-05.6 | Un equipo en estado Baja | Se intenta editar por URL o por API | Se rechaza con «Un equipo dado de baja no admite edición.». |
| CA-05.7 | La pantalla de edición | Se guarda sin modificar nada | Se informa «No se detectaron cambios para guardar.» y no se genera registro de auditoría. |
| CA-05.8 | Un equipo con categoría desactivada | Se editan otros campos | La categoría se conserva y el cambio se guarda. |
| CA-05.9 | Una edición que cambia modelo y observaciones | Se consulta la auditoría | Hay un registro `MODIFICACION` con «modelo: anterior → nuevo» y «observaciones: anterior → nuevo». |

---

### HU-06 · Consultar la ficha de un equipo

**Como** Operador, **quiero** ver en una sola pantalla toda la información de un equipo, **para** entender su situación completa y su recorrido sin consultar varias secciones.

**RF:** RF-04 · **Prioridad:** Media

**Reglas de negocio**
- La ficha muestra:
  - código
  - estado actual
  - marca, modelo, número de serie y categoría
  - observaciones
  - fecha de alta
  - fecha del último cambio de estado
- Incluye el **historial completo de estados**, del más reciente al más antiguo, con fecha-hora, estado anterior, estado nuevo, usuario y motivo.
- La ficha solo ofrece las acciones válidas para el estado y el rol (ver HU-08 y HU-09).
- Un código inexistente muestra un mensaje de **no encontrado**, nunca un error técnico.

**Criterios de aceptación**

| CA | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-06.1 | Un equipo existente | Se hace clic en su código desde el listado | Se abre su ficha con todos los datos enumerados. |
| CA-06.2 | Un equipo con varios cambios de estado | Se consulta su ficha | El historial lista todos los cambios con el más reciente primero, y la «fecha del último cambio» coincide con la primera fila. |
| CA-06.3 | La primera entrada del historial de cualquier equipo | Se consulta | Es su alta: «— → Disponible», con usuario, fecha y motivo «Alta del equipo en el inventario». |
| CA-06.4 | La URL `/equipos/EQ-999999` | Se abre | Se muestra «No se encontró ningún equipo con el código «EQ-999999».» (HTTP 404) sin errores técnicos. |
| CA-06.5 | Las fechas de la ficha y del historial | Se muestran | Usan el formato dd/mm/aaaa hh:mm:ss. |
| CA-06.6 | Una categoría desactivada | Se ve la ficha de un equipo que la tiene | Se indica junto al nombre «(desactivada)». |

**Fuera de alcance V1:** responsable vigente y tenencias anteriores (módulo de personas, V2, RF-04 última condición) y acceso por QR (V2, RF-11).

---

### HU-07 · Buscar y filtrar equipos

**Como** Operador, **quiero** encontrar equipos a partir de datos parciales y acotar el listado por categoría y estado, **para** localizar rápidamente lo que necesito sin recorrer todo el inventario.

**RF:** RF-06 · **Prioridad:** Media

**Reglas de negocio**
- La búsqueda por texto opera sobre **código, marca, modelo y número de serie**. La coincidencia es parcial («contiene»), sin distinguir mayúsculas e ignora espacios al inicio y al final.
- Los filtros **categoría** y **estado** se combinan entre sí y con el texto: todos deben cumplirse.
- Los equipos **dados de baja se excluyen por defecto**. Se incluyen con la casilla «Incluir dados de baja» o eligiendo el estado «Baja».
- Sin coincidencias se muestra un mensaje explicativo, no una tabla vacía.
- Los filtros aplicados se ven como etiquetas y se limpian todos con «Limpiar filtros».
- Con más de 50 resultados, el listado se pagina de a 50.

**Criterios de aceptación**

| CA | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-07.1 | Equipos «ThinkPad T14» y «ThinkPad T460» | Se busca `thinkpad` | Aparecen ambos. |
| CA-07.2 | El equipo EQ-000007 | Se busca `000007` | Aparece EQ-000007. |
| CA-07.3 | La serie `PF3ABC01` | Se busca `pf3abc` | Aparece el equipo con esa serie. |
| CA-07.4 | El listado | Se busca `lenovo`, categoría «Notebook» y estado «Asignado» | Solo aparecen equipos que cumplen las tres condiciones. |
| CA-07.5 | El listado inicial | Se muestra sin filtros | No aparece ningún equipo en estado Baja. |
| CA-07.6 | El listado | Se marca «Incluir dados de baja» o se filtra por estado «Baja» | Los equipos dados de baja aparecen. |
| CA-07.7 | El listado | Se busca un texto sin coincidencias (p. ej. `zzzz`) | Se muestra «No se encontraron equipos que coincidan con la búsqueda y los filtros aplicados…» y no se muestra la tabla. |
| CA-07.8 | Filtros aplicados | Se mira el formulario | Debajo del formulario se ve una etiqueta por cada filtro activo. |
| CA-07.9 | Filtros aplicados | Se presiona «Limpiar filtros» | Se vacían todos los filtros con una sola acción y se vuelve al listado inicial. |
| CA-07.10 | 50 equipos que cumplen el filtro | Se muestra el listado | No se pagina. |
| CA-07.11 | 51 o más equipos que cumplen el filtro | Se muestra el listado | Aparecen 50 por página, con «Página X de Y» y botones Anterior y Siguiente. |
| CA-07.12 | Caracteres especiales como `%` o `_` | Se busca con ellos | Se interpretan literalmente, no como comodines. |

---

### HU-08 · Cambiar el estado de un equipo

**Como** Operador, **quiero** registrar el cambio de situación de un equipo con su motivo, **para** que el inventario refleje lo que realmente pasa con cada equipo y quede constancia de por qué cambió.

**RF:** RF-05 · **Prioridad:** Alta

**Reglas de negocio · Transiciones permitidas**

| Desde \ Hacia | Disponible | Asignado | En reparación | Baja |
|---|---|---|---|---|
| **Disponible** | — | ✔ | ✔ | ✔ (solo Administrador, HU-09) |
| **Asignado** | ✔ (devolución) | — | ✔ | ✘ |
| **En reparación** | ✔ | ✘ | — | ✔ (solo Administrador, HU-09) |
| **Baja** | ✘ | ✘ | ✘ | — (estado terminal) |

- La interfaz **ofrece solo los estados alcanzables** desde el estado actual y según el rol. El servidor **vuelve a validar** la transición aunque llegue por API.
- Una transición no permitida se rechaza y **el estado no cambia**.
- Cada cambio exige un **motivo de 10 a 500 caracteres**. Los espacios al inicio y al final no cuentan.
- **Concurrencia:** si dos usuarios cambian el estado del mismo equipo a la vez, se aplica solo el primero. El segundo recibe un aviso de conflicto y debe recargar la ficha.
- Cada cambio actualiza la fecha del último cambio, agrega una fila al historial y queda en auditoría (`CAMBIO_ESTADO`).

**Criterios de aceptación**

| CA | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-08.1 | Un equipo Disponible | El Operador abre «Cambiar estado» | El selector ofrece solo «Asignado» y «En reparación». |
| CA-08.2 | Un equipo Asignado | Se abre «Cambiar estado» | Se ofrecen solo «Disponible» y «En reparación». |
| CA-08.3 | Un equipo En reparación | El Operador abre «Cambiar estado» | Se ofrece solo «Disponible». |
| CA-08.4 | Un equipo Disponible | Se elige «Asignado» con un motivo de 10 o más caracteres y se confirma | El estado pasa a Asignado, la ficha muestra el mensaje de éxito y el historial suma una fila con fecha, usuario y motivo al tope. |
| CA-08.5 | El cambio de estado | Se confirma con un motivo de 9 caracteres o menos, de solo espacios, o de más de 500 | Se rechaza con «El motivo debe tener entre 10 y 500 caracteres.» y el estado no cambia. |
| CA-08.6 | El cambio de estado | El motivo tiene exactamente 10 o exactamente 500 caracteres | Se acepta (valores límite). |
| CA-08.7 | Un equipo Asignado | Se fuerza por API el paso a «Asignado», o un equipo En reparación a «Asignado» | Se rechaza (HTTP 422) indicando que la transición no está permitida, y el estado queda igual. |
| CA-08.8 | Un equipo en Baja | Se fuerza por API cualquier cambio de estado | Se rechaza con «Un equipo dado de baja no admite cambios de estado.». |
| CA-08.9 | Dos usuarios con la ficha del mismo equipo abierta | Ambos confirman un cambio de estado | Se aplica el primero. El segundo ve «Otro usuario modificó el estado de este equipo…» y el botón «Recargar ficha». En el historial queda un único cambio. |
| CA-08.10 | Un cambio de estado exitoso | Se consulta la auditoría | Existe un registro `CAMBIO_ESTADO` con el estado anterior, el nuevo y el motivo. |

**Fuera de alcance V1:** el responsable vigente asociado al estado Asignado (entregas y devoluciones con acta, RF-09 y RF-10, V2). En V1 la asignación y la devolución se registran como cambio de estado con motivo.

---

### HU-09 · Dar de baja un equipo

**Como** Administrador, **quiero** retirar del inventario activo un equipo que ya no se usa, **para** dejar de contarlo como disponible sin perder su historia.

**RF:** RF-05, RF-02 · **Prioridad:** Alta

**Reglas de negocio**
- La baja es un **cambio de estado a «Baja»**, nunca un borrado físico (RNF-05). El equipo, su historial y su auditoría se conservan.
- Solo la puede ejecutar el **Administrador** y exige **motivo** de 10 a 500 caracteres y **confirmación explícita** (RNF-02).
- Solo se puede dar de baja un equipo **Disponible** o **En reparación**. Un equipo **Asignado** debe pasar primero por la devolución (Asignado → Disponible).
- Un equipo dado de baja **no se edita, no cambia de estado**, no aparece en el listado por defecto, su código no se reutiliza y su número de serie sigue bloqueado para nuevas altas.

**Criterios de aceptación**

| CA | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-09.1 | Un Administrador en la ficha de un equipo Disponible o En reparación | Presiona «Dar de baja», escribe el motivo, confirma y acepta el diálogo «¿Confirmás la baja?» | El equipo queda en estado Baja, con el mensaje «El equipo EQ-XXXXXX fue dado de baja.». |
| CA-09.2 | El diálogo de confirmación | El Administrador presiona «Cancelar» | No se produce ningún cambio. |
| CA-09.3 | Un equipo Asignado | El Administrador ve su ficha | El botón «Dar de baja» está deshabilitado con el aviso «Para dar de baja este equipo primero registrá su devolución…». |
| CA-09.4 | Un equipo Asignado | La baja se fuerza por API | Se rechaza con el mismo motivo (HTTP 422). |
| CA-09.5 | Un Operador | Intenta la baja por API | Recibe HTTP 403, el equipo no cambia y el intento queda en auditoría (ver HU-03). |
| CA-09.6 | Un equipo dado de baja | Se consulta su ficha | Su historial completo se conserva y no ofrece «Editar datos», «Cambiar estado» ni «Dar de baja». |
| CA-09.7 | Un equipo dado de baja | Se consulta el listado por defecto | No aparece. Sí aparece con el filtro «Incluir dados de baja». |
| CA-09.8 | Un equipo dado de baja | Se intenta registrar otro con su número de serie | Se rechaza por duplicado. |
| CA-09.9 | Una baja | Se completa | Queda en auditoría como `BAJA`, con usuario, motivo y fecha-hora. |

---

## Módulo: Configuración y control

### HU-10 · Administrar categorías de equipos

**Como** Administrador, **quiero** crear, renombrar, desactivar y eliminar las categorías con las que se clasifican los equipos, **para** adaptar el sistema a la realidad de mi organización sin afectar los equipos ya cargados.

**RF:** RF-06 · **Prioridad:** Media

**Reglas de negocio**
- El nombre es obligatorio, tiene entre 2 y 50 caracteres y es **único** sin distinguir mayúsculas.
- **Renombrar** una categoría se refleja en todos los equipos que la tienen.
- **Desactivar** una categoría:
  - deja de ofrecerla en el alta
  - la conserva en los equipos que ya la tienen
  - se puede revertir con «Activar»
- Solo se puede **eliminar** una categoría **sin equipos asociados**, contando también los dados de baja. Si tiene equipos, se sugiere desactivarla.
- Todas las operaciones quedan en auditoría.

**Criterios de aceptación**

| CA | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-10.1 | El Administrador en «Categorías» | Crea la categoría «Servidor» | Aparece en la lista como Activa, con 0 equipos, y se ofrece en el alta de equipos. |
| CA-10.2 | Una categoría «Notebook» existente | Se crea o se renombra otra como `notebook` | Se rechaza por nombre repetido. |
| CA-10.3 | El nombre de categoría | Se deja vacío o con 1 carácter | Se rechaza indicando el campo. |
| CA-10.4 | Una categoría con equipos | Se renombra | La ficha y el listado de esos equipos muestran el nuevo nombre. |
| CA-10.5 | Una categoría activa | Se desactiva | Deja de aparecer en el alta de equipos y los equipos que la tenían la siguen mostrando con la marca «(desactivada)». |
| CA-10.6 | Una categoría con 1 o más equipos | Se intenta eliminar | Se rechaza con «No se puede eliminar la categoría «X» porque tiene N equipo(s) asociado(s). Podés desactivarla…». |
| CA-10.7 | Una categoría sin equipos | Se elimina y se confirma | Desaparece de la lista. |
| CA-10.8 | Un Operador | Intenta cualquier operación de categorías | Se aplica HU-03 (403). |
| CA-10.9 | Una operación de categorías | Se completa | Queda en auditoría como `ALTA`, `MODIFICACION`, `DESACTIVACION`, `ACTIVACION` o `ELIMINACION`, con entidad CATEGORIA. |

---

### HU-11 · Administrar usuarios del sistema

**Como** Administrador, **quiero** gestionar quiénes acceden al sistema y con qué rol, **para** controlar el acceso y poder quitarlo de inmediato cuando alguien deja de necesitarlo.

**RF:** RF-02 · **Prioridad:** Alta

**Reglas de negocio**
- Datos del usuario:
  - **nombre de usuario:** obligatorio, de 3 a 30 caracteres (letras, números, punto, guion o guion bajo), **único** sin distinguir mayúsculas
  - **nombre y apellido:** obligatorio
  - **rol:** Administrador u Operador
  - **contraseña:** obligatoria
- La contraseña tiene **mínimo 8 caracteres, con al menos una letra y un número**. Se guarda **cifrada con hash y sal** y **nunca se muestra**, ni en pantalla, ni en la API, ni en la auditoría.
- Se puede editar el nombre y el rol, y asignar una nueva contraseña.
- **Desactivar** un usuario le quita el acceso de inmediato (sus sesiones abiertas se invalidan) y **conserva íntegros sus registros de auditoría**. Los usuarios nunca se eliminan.
- No se puede **desactivar el propio usuario** ni **desactivar o quitarle el rol al último Administrador activo**. Tampoco se puede cambiar el propio rol.

**Criterios de aceptación**

| CA | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-11.1 | El Administrador en «Usuarios» | Crea un Operador con contraseña `abcdefg1` | El usuario aparece activo en la lista y puede iniciar sesión con esas credenciales. |
| CA-11.2 | Un usuario `tecnico1` existente | Se crea otro como `TECNICO1` | Se rechaza por usuario repetido. |
| CA-11.3 | El formulario de alta | La contraseña es `abc1234` (7 caracteres), `abcdefgh` (sin número), `12345678` (sin letra) o está vacía | Se rechaza indicando la regla incumplida. |
| CA-11.4 | El formulario de alta | El usuario tiene espacios o menos de 3 caracteres, o el rol no se eligió | Se rechaza indicando el campo. |
| CA-11.5 | La lista de usuarios y la API | Se consultan | Nunca muestran la contraseña ni su hash. |
| CA-11.6 | Un Operador | Se le cambia el rol a Administrador | En su siguiente operación accede a las funciones de Administrador. |
| CA-11.7 | Un usuario con sesión abierta | El Administrador lo desactiva y confirma | Su siguiente acción lo lleva al login. Si intenta ingresar, recibe el mensaje genérico de HU-01. |
| CA-11.8 | Un usuario desactivado | Se consulta la auditoría filtrando por ese usuario | Sus registros siguen presentes. |
| CA-11.9 | El Administrador | Intenta desactivarse a sí mismo | Se rechaza con «No podés desactivar tu propio usuario.». Si es el único Administrador activo, el mensaje es «No se puede desactivar al último Administrador activo del sistema.». |
| CA-11.10 | El Administrador | Intenta cambiar su propio rol | Se rechaza con «No podés cambiar tu propio rol.». |
| CA-11.11 | Un usuario | El Administrador le asigna una nueva contraseña válida | El usuario ingresa con la nueva contraseña y no con la anterior. |
| CA-11.12 | Una operación sobre usuarios | Se completa | Queda en auditoría. En el cambio de contraseña el valor se registra como «(oculta)». |

---

### HU-12 · Consultar el registro de auditoría

**Como** Administrador, **quiero** revisar qué acciones se ejecutaron en el sistema, quién las hizo y cuándo, **para** poder reconstruir qué pasó ante una inconsistencia, una auditoría o un reclamo.

**RF:** RF-07 · **Prioridad:** Alta

**Reglas de negocio**
- Se registran:
  - **sesión:** ingresos exitosos (`LOGIN_OK`), ingresos fallidos (`LOGIN_FALLIDO`), cierres de sesión (`LOGOUT`) y rechazos por permisos (`ACCESO_DENEGADO`)
  - **cambios de datos:** altas (`ALTA`), modificaciones (`MODIFICACION`), cambios de estado (`CAMBIO_ESTADO`), bajas (`BAJA`), activaciones y desactivaciones, y eliminaciones de categorías
- Cada registro guarda:
  - usuario
  - acción
  - entidad (SESION, EQUIPO, CATEGORIA, USUARIO, AUDITORIA)
  - identificador afectado
  - fecha y hora **con precisión de segundos**
  - en las modificaciones, **el valor anterior y el nuevo** de cada campo
- La auditoría es **imborrable**: no hay función para editar ni eliminar registros. La API responde 405 y la base de datos rechaza cualquier UPDATE o DELETE.
- La consulta se filtra por **usuario, tipo de acción, entidad y rango de fechas** (filtros combinables), se ordena de lo más reciente a lo más antiguo, se pagina de a 50 y es **exclusiva del Administrador**.

**Criterios de aceptación**

| CA | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-12.1 | El Administrador en «Auditoría» | Abre la pantalla | Ve los registros del más reciente al más antiguo, con fecha-hora (dd/mm/aaaa hh:mm:ss), usuario, acción, entidad, identificador y detalle. |
| CA-12.2 | Una edición de equipo previa | Se busca su registro | El detalle muestra «campo: valor anterior → valor nuevo» por cada campo cambiado. |
| CA-12.3 | Un intento de login fallido con el usuario `noexiste` | Se filtra por acción `LOGIN_FALLIDO` | Aparece el intento con el nombre ingresado. |
| CA-12.4 | Un rechazo por permisos (HU-03) | Se filtra por `ACCESO_DENEGADO` | Aparece con el usuario y la operación intentada. |
| CA-12.5 | Registros de distintas fechas | Se filtra Desde 01/09/2026 Hasta 01/09/2026 | Solo aparecen registros de ese día. Ambos extremos son inclusivos. |
| CA-12.6 | Los filtros de fecha | «Desde» es posterior a «Hasta» | Se informa que el rango no es válido. |
| CA-12.7 | Los filtros | Se combinan usuario `admin`, acción `BAJA` y entidad `EQUIPO` | Solo aparecen registros que cumplen los tres. |
| CA-12.8 | Filtros sin coincidencias | Se aplican | Se muestra «No hay registros de auditoría que coincidan con los filtros aplicados.». |
| CA-12.9 | La pantalla de auditoría | Se consulta | No ofrece ningún botón para editar o eliminar. |
| CA-12.10 | La API de auditoría | Se invoca con PUT o DELETE | Responde 405 y el registro no cambia. |
| CA-12.11 | Un Operador | Accede por menú, URL o API | Se le niega el acceso (HU-03). |
| CA-12.12 | Más de 50 registros | Se consulta | Se pagina de a 50. |

---

## Observaciones sobre el documento base (para corregir antes de entregar)

1. **HU-08:** dice «Como Ad, quiero…». Debería decir **«Como Operador»** (el Operador cambia estados y la baja es exclusiva del Administrador, HU-09).
2. **Roadmap V1:** menciona «generación de códigos correlativos **QR**» y «**calendarización de mantenimiento**». Esto contradice RU-09 y RU-10 (V2), RU-13 (Opcional), RF-11 (QR) y las propias HU de V1, que no incluyen QR ni mantenimiento. Sugerencia: «Login y roles; alta, edición y baja de equipos con código interno correlativo; categorías, buscador y filtros; auditoría de acciones». Además dice «alta, baja, edición y baja», con la baja repetida.
3. **HU-13:** no figura en el documento. Agregarla, porque RF-03 y RU-02 la exigen y es uno de los cálculos derivados que justifican la complejidad.
4. **RF-04:** el responsable vigente y las tenencias anteriores dependen del módulo de personas (V2). En V1 la ficha no los muestra.
