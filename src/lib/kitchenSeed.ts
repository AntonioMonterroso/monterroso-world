import type { Ingredient, Meal, PantryItem, Recipe } from './kitchen'

/** Lo que había en casa cuando se armó el recetario. Se carga una sola vez; luego se maneja desde Despensa. */
export const SEED_PANTRY: Omit<PantryItem, 'id' | 'notes'>[] = ([
  ['Proteínas', ['Pechuga de pollo', 'Carne molida', 'Atún']],
  ['Lácteos y huevos', ['Huevos', 'Queso panela', 'Requesón', 'Yogurt griego']],
  ['Verduras y hierbas', ['Brócoli', 'Apio', 'Cebolla', 'Tomate', 'Cilantro', 'Champiñones', 'Ajo', 'Cebollín', 'Arvejas', 'Guisantes dulces']],
  ['Pan, masa y tortillas', ['Pan integral', 'Tortillas de harina', 'Masa', 'Tostadas', 'Nachos']],
  ['Pastas y granos', ['Fideo cabello', 'Tallarín', 'Macarrón', 'Lasaña', 'Paella', 'Avena', 'Mezcla para panqueques', 'Empanizador']],
  ['Especias', ['Sal', 'Pimienta negra molida', 'Pimienta negra entera', 'Clavo de olor', 'Canela', 'Comino', 'Paprika', 'Bijol', 'Laurel', 'Orégano', 'Tomillo', 'Ajo en polvo', 'Consomé', 'Pepitoria']],
  ['Aceites y vinagres', ['Aceite de oliva extra virgen', 'Aceite de oliva virgen', 'Aceite de aguacate', 'Vinagre balsámico', 'Vinagre de manzana', 'Vinagre blanco', 'Vinagre de uva']],
  ['Salsas y enlatados', ['Ranch', 'Mayonesa', 'Jugo Maggi', 'Salsa de ostiones', 'Salsa Natura ranchera', 'Salsa de tomate en frasco', 'Frijol en lata', 'Sopa Maggi de pollo con fideos', 'Crema de espárragos Maggi', 'Vino blanco']],
  ['Dulces y bebidas', ['Miel', 'Azúcar', 'Gelatina sin sabor', 'Mermelada de fresa', 'Chocomilk']],
] as const).flatMap(([category, names]) => names.map((name) => ({ name, category, have: true })))

const i = (n: string, k: string | null = null, opt = false): Ingredient => (opt ? { n, k, opt } : { n, k })
const sp = (): Ingredient[] => [i('Sal al gusto', 'Sal'), i('Pimienta negra molida al gusto', 'Pimienta negra molida')]

type Seed = Omit<Recipe, 'id' | 'favorite' | 'cooked_count' | 'last_cooked'>
const r = (title: string, meal: Meal, minutes: number, servings: number, ingredients: Ingredient[], steps: string[], tips: string | null = null): Seed =>
  ({ title, meal, minutes, servings, ingredients, steps, tips })

export const SEED_RECIPES: Seed[] = [
  // ─── Desayunos ───
  r('Huevos rancheros', 'desayuno', 15, 2, [
    i('4 huevos', 'Huevos'), i('4 tortillas de harina', 'Tortillas de harina'), i('1 taza de salsa ranchera', 'Salsa Natura ranchera'),
    i('1/2 lata de frijol', 'Frijol en lata'), i('50 g de queso panela', 'Queso panela'), i('Cilantro picado', 'Cilantro', true), i('Aceite de aguacate', 'Aceite de aguacate'), ...sp(),
  ], [
    'Calienta el frijol en una olla pequeña con un chorrito de agua.',
    'Dora las tortillas en el comal o sartén seco y resérvalas tapadas.',
    'Fríe los huevos estrellados en aceite de aguacate, con sal y pimienta.',
    'Calienta la salsa ranchera aparte.',
    'Arma: tortilla, frijol, huevo, salsa encima, queso panela desmoronado y cilantro.',
  ]),
  r('Omelette de champiñones y panela', 'desayuno', 12, 1, [
    i('3 huevos', 'Huevos'), i('4 champiñones en láminas', 'Champiñones'), i('30 g de queso panela en cubitos', 'Queso panela'),
    i('1 rama de cebollín picada', 'Cebollín'), i('1 cdta de aceite de oliva', 'Aceite de oliva virgen'), ...sp(),
  ], [
    'Saltea los champiñones en el aceite hasta que suelten el agua y se doren.',
    'Bate los huevos con sal, pimienta y la mitad del cebollín.',
    'Vierte los huevos sobre los champiñones a fuego medio-bajo y deja cuajar sin mover.',
    'Pon el queso panela en una mitad, dobla y deja un minuto más.',
    'Sirve con el resto del cebollín encima.',
  ]),
  r('Huevos a la mexicana en tortilla', 'desayuno', 12, 2, [
    i('4 huevos', 'Huevos'), i('1 tomate picado', 'Tomate'), i('1/4 de cebolla picada', 'Cebolla'), i('Cilantro picado', 'Cilantro'),
    i('Tortillas de harina', 'Tortillas de harina'), i('Aceite de aguacate', 'Aceite de aguacate'), ...sp(),
  ], [
    'Sofríe la cebolla en un poco de aceite hasta que esté transparente.',
    'Agrega el tomate y cocina 2 minutos.',
    'Echa los huevos batidos con sal y revuelve suave hasta que cuajen.',
    'Apaga, agrega el cilantro y sirve en tortillas calientes.',
  ]),
  r('Shakshuka chapina', 'desayuno', 25, 2, [
    i('1 taza de salsa de tomate en frasco', 'Salsa de tomate en frasco'), i('1 tomate picado', 'Tomate'), i('1/2 cebolla en juliana', 'Cebolla'),
    i('2 dientes de ajo', 'Ajo'), i('1/2 cdta de comino', 'Comino'), i('1 cdta de paprika', 'Paprika'), i('4 huevos', 'Huevos'),
    i('Queso panela desmoronado', 'Queso panela'), i('Cilantro', 'Cilantro'), i('Aceite de oliva', 'Aceite de oliva virgen'), i('Pan integral para mojar', 'Pan integral'), ...sp(),
  ], [
    'Sofríe cebolla y ajo en aceite de oliva hasta que suavicen.',
    'Agrega comino y paprika, mueve 30 segundos para que suelten aroma.',
    'Añade el tomate y la salsa; cocina 8 minutos hasta que espese. Sazona.',
    'Haz 4 huecos y rompe un huevo en cada uno. Tapa y cocina 5–7 minutos, hasta que la clara cuaje y la yema siga suave.',
    'Termina con panela y cilantro. Sirve con pan integral tostado.',
  ]),
  r('Chilaquiles rojos', 'desayuno', 20, 2, [
    i('2 tazas de nachos o tostadas en pedazos', 'Nachos'), i('1 1/2 taza de salsa ranchera', 'Salsa Natura ranchera'), i('2 huevos', 'Huevos', true),
    i('Queso panela', 'Queso panela'), i('Cebolla en aros', 'Cebolla'), i('Yogurt griego (como crema)', 'Yogurt griego'), i('Cilantro', 'Cilantro'),
  ], [
    'Calienta la salsa en un sartén amplio.',
    'Echa los nachos y mueve hasta cubrirlos; solo un minuto para que no se ablanden de más.',
    'Sirve de inmediato con queso, cebolla, una cucharada de yogurt griego y cilantro.',
    'Si quieres, ponle un huevo estrellado encima.',
  ], 'El yogurt griego con una pizca de sal sustituye muy bien a la crema.'),
  r('Panqueques con yogurt, fresa y miel', 'desayuno', 20, 2, [
    i('1 taza de mezcla para panqueques', 'Mezcla para panqueques'), i('1 huevo', 'Huevos'), i('3/4 taza de leche', 'Leche'),
    i('1/2 taza de yogurt griego', 'Yogurt griego'), i('Mermelada de fresa', 'Mermelada de fresa'), i('Miel', 'Miel'), i('Canela', 'Canela', true),
  ], [
    'Mezcla la harina con el huevo y la leche sin batir de más (algunos grumos están bien).',
    'Cocina cucharadas de mezcla en sartén a fuego medio; voltea cuando salgan burbujas.',
    'Sirve con yogurt griego, una cucharada de mermelada y un hilo de miel. Canela encima si te gusta.',
  ], 'Sin leche: usa agua y una cucharada extra de yogurt en la mezcla.'),
  r('Pan francés integral', 'desayuno', 15, 2, [
    i('4 rebanadas de pan integral', 'Pan integral'), i('2 huevos', 'Huevos'), i('1/2 taza de leche', 'Leche'),
    i('1/2 cdta de canela', 'Canela'), i('1 cda de azúcar', 'Azúcar'), i('Miel', 'Miel'), i('Aceite de aguacate', 'Aceite de aguacate'),
  ], [
    'Bate huevos, leche, canela y azúcar en un plato hondo.',
    'Pasa cada rebanada por la mezcla, de los dos lados, sin dejarla empapar demasiado.',
    'Dora en sartén con poco aceite, 2 minutos por lado.',
    'Sirve con miel o mermelada.',
  ]),
  r('Tostada de requesón y tomate', 'desayuno', 8, 1, [
    i('2 rebanadas de pan integral', 'Pan integral'), i('4 cdas de requesón', 'Requesón'), i('1 tomate en rodajas', 'Tomate'),
    i('Orégano', 'Orégano'), i('Aceite de oliva extra virgen', 'Aceite de oliva extra virgen'), ...sp(),
  ], [
    'Tuesta el pan.',
    'Unta el requesón, pon el tomate encima.',
    'Termina con sal, pimienta, orégano y un hilo de aceite de oliva extra virgen.',
  ]),
  r('Avena con canela y miel', 'desayuno', 10, 1, [
    i('1/2 taza de avena', 'Avena'), i('1 taza de agua o leche', null), i('1 raja de canela', 'Canela'), i('1 clavo de olor', 'Clavo de olor', true),
    i('Miel al gusto', 'Miel'), i('Pizca de sal', 'Sal'),
  ], [
    'Hierve el agua (o leche) con la canela, el clavo y la sal.',
    'Agrega la avena y cocina 5 minutos moviendo.',
    'Saca la canela y el clavo, endulza con miel.',
  ]),
  r('Avena de noche con yogurt y fresa', 'desayuno', 5, 1, [
    i('1/2 taza de avena', 'Avena'), i('1/2 taza de yogurt griego', 'Yogurt griego'), i('1/2 taza de agua o leche', null),
    i('1 cda de mermelada de fresa', 'Mermelada de fresa'), i('1 cdta de miel', 'Miel'), i('Canela', 'Canela', true),
  ], [
    'Mezcla avena, yogurt, el líquido y la miel en un frasco.',
    'Pon la mermelada encima, tapa y deja en la refri toda la noche.',
    'En la mañana, mueve y come frío.',
  ], 'Prepara 3 frascos el domingo y tienes desayuno hecho hasta el miércoles.'),
  r('Licuado de avena con Chocomilk', 'desayuno', 5, 1, [
    i('1 taza de leche', 'Leche'), i('3 cdas de avena', 'Avena'), i('2 cdas de Chocomilk', 'Chocomilk'), i('Hielo', null, true),
  ], [
    'Licúa todo hasta que la avena quede fina.',
    'Sirve de inmediato.',
  ]),

  // ─── Almuerzos ───
  r('Pollo al ajillo con champiñones y tallarín', 'almuerzo', 35, 3, [
    i('2 pechugas en cubos', 'Pechuga de pollo'), i('250 g de champiñones en láminas', 'Champiñones'), i('6 dientes de ajo en láminas', 'Ajo'),
    i('1/2 taza de vino blanco', 'Vino blanco'), i('1 cdta de consomé', 'Consomé'), i('Tomillo', 'Tomillo'), i('250 g de tallarín', 'Tallarín'),
    i('3 cdas de aceite de oliva', 'Aceite de oliva virgen'), i('Cebollín picado', 'Cebollín', true), ...sp(),
  ], [
    'Cuece el tallarín en agua con sal; guarda media taza del agua de cocción.',
    'Sazona el pollo con sal, pimienta y tomillo; dóralo en el aceite y sácalo.',
    'En el mismo sartén, dora el ajo a fuego bajo (que no se queme) y luego los champiñones.',
    'Agrega el vino blanco y deja reducir 2 minutos. Añade el consomé y el agua de la pasta.',
    'Regresa el pollo, mezcla con el tallarín y termina con cebollín.',
  ]),
  r('Pollo empanizado al horno con brócoli y dip de ranch', 'almuerzo', 40, 3, [
    i('2 pechugas en tiras', 'Pechuga de pollo'), i('1 taza de empanizador', 'Empanizador'), i('2 huevos', 'Huevos'), i('1 cdta de ajo en polvo', 'Ajo en polvo'),
    i('1 cdta de paprika', 'Paprika'), i('1 brócoli en arbolitos', 'Brócoli'), i('3 cdas de ranch', 'Ranch'), i('3 cdas de yogurt griego', 'Yogurt griego'),
    i('Aceite de aguacate en spray o brocha', 'Aceite de aguacate'), ...sp(),
  ], [
    'Precalienta el horno a 200 °C.',
    'Sazona las tiras con sal, pimienta, ajo en polvo y paprika.',
    'Pásalas por huevo batido y luego por empanizador. Acomódalas en bandeja con un poco de aceite.',
    'Pon el brócoli en la misma bandeja con aceite y sal. Hornea 20–25 minutos, volteando a la mitad.',
    'Mezcla ranch con yogurt griego para el dip.',
  ], 'También sale en freidora de aire: 12 minutos a 190 °C.'),
  r('Pollo glaseado de miel y ostión', 'almuerzo', 25, 3, [
    i('2 pechugas en cubos', 'Pechuga de pollo'), i('3 cdas de salsa de ostiones', 'Salsa de ostiones'), i('2 cdas de miel', 'Miel'),
    i('1 cda de vinagre de manzana', 'Vinagre de manzana'), i('2 dientes de ajo picados', 'Ajo'), i('1 brócoli en arbolitos', 'Brócoli'),
    i('1 cdta de jugo Maggi', 'Jugo Maggi'), i('Cebollín', 'Cebollín'), i('Pepitoria tostada', 'Pepitoria', true), i('Aceite de aguacate', 'Aceite de aguacate'),
  ], [
    'Mezcla ostión, miel, vinagre y jugo Maggi.',
    'Dora el pollo en aceite bien caliente; agrega el ajo al final.',
    'Echa el brócoli y 3 cucharadas de agua; tapa 3 minutos.',
    'Vierte la salsa y mueve hasta que brille y espese.',
    'Termina con cebollín y pepitoria tostada.',
  ]),
  r('Pepián casero de pollo', 'almuerzo', 60, 4, [
    i('2 pechugas en piezas grandes', 'Pechuga de pollo'), i('3 tomates', 'Tomate'), i('1/2 cebolla', 'Cebolla'), i('2 dientes de ajo', 'Ajo'),
    i('3 cdas de pepitoria', 'Pepitoria'), i('1 raja de canela', 'Canela'), i('2 clavos de olor', 'Clavo de olor'), i('1 cdta de paprika', 'Paprika'),
    i('1/4 cdta de bijol', 'Bijol'), i('1 cdta de consomé', 'Consomé'), i('2 tortillas o 1 tostada (para espesar)', 'Tostadas'), i('Cilantro', 'Cilantro'),
    i('Chile guaque o pasa', 'Chile guaque', true), i('Arvejas', 'Arvejas', true), ...sp(),
  ], [
    'Cuece el pollo en agua con sal, un pedazo de cebolla y consomé, 25 minutos. Guarda el caldo.',
    'En comal seco tuesta tomate, cebolla y ajo hasta que tengan manchas negras.',
    'Tuesta aparte la pepitoria, la canela y el clavo (y el chile si tienes), con cuidado: se queman rápido.',
    'Licúa todo lo tostado con la tostada, la paprika, el bijol y 2 tazas de caldo.',
    'Cuela la salsa a la olla, cocina 15 minutos a fuego bajo y agrega el pollo (y arvejas). Ajusta de sal.',
    'Sirve con cilantro.',
  ], 'El punto está en tostar bien sin quemar: si la pepitoria se pone negra, amarga.'),
  r('Paella de pollo con arvejas', 'almuerzo', 45, 4, [
    i('1 paquete de paella', 'Paella'), i('1 pechuga en cubos', 'Pechuga de pollo'), i('1/2 cebolla picada', 'Cebolla'), i('1 tomate rallado', 'Tomate'),
    i('2 dientes de ajo', 'Ajo'), i('1/2 taza de arvejas', 'Arvejas'), i('1/2 cdta de paprika', 'Paprika'), i('Pizca de bijol', 'Bijol'),
    i('1 cdta de consomé', 'Consomé'), i('1/4 taza de vino blanco', 'Vino blanco', true), i('Aceite de oliva', 'Aceite de oliva virgen'), i('Limón', 'Limón', true), ...sp(),
  ], [
    'Dora el pollo con sal y paprika en aceite de oliva; sácalo.',
    'Sofríe cebolla, ajo y tomate hasta que se haga una pasta.',
    'Agrega el arroz de la paella y mueve un minuto. Echa el vino si usas.',
    'Añade el agua que pida el paquete con consomé, bijol y su sobre de sazón. No muevas más.',
    'A los 10 minutos acomoda el pollo y las arvejas encima. Cocina hasta que se seque el líquido.',
    'Reposa 5 minutos tapado. Sirve con limón.',
  ]),
  r('Pollo en salsa de yogurt y paprika', 'almuerzo', 30, 3, [
    i('2 pechugas en cubos', 'Pechuga de pollo'), i('1/2 taza de yogurt griego', 'Yogurt griego'), i('1 cda de paprika', 'Paprika'), i('1 cdta de comino', 'Comino'),
    i('1 cdta de ajo en polvo', 'Ajo en polvo'), i('1/2 cebolla picada', 'Cebolla'), i('1 taza de salsa de tomate en frasco', 'Salsa de tomate en frasco'),
    i('Cilantro', 'Cilantro'), i('Aceite de aguacate', 'Aceite de aguacate'), ...sp(),
  ], [
    'Marina el pollo con la mitad del yogurt, paprika, comino, ajo en polvo y sal (mínimo 15 minutos).',
    'Dora el pollo en aceite. Agrega la cebolla y cocina 3 minutos.',
    'Echa la salsa de tomate y cocina 10 minutos a fuego bajo.',
    'Apaga el fuego y mezcla el resto del yogurt (con el fuego apagado no se corta).',
    'Sirve con cilantro y tortillas o pan.',
  ]),
  r('Pollo guisado en vino blanco', 'almuerzo', 45, 4, [
    i('2 pechugas en piezas', 'Pechuga de pollo'), i('1 cebolla en juliana', 'Cebolla'), i('2 tomates picados', 'Tomate'), i('3 dientes de ajo', 'Ajo'),
    i('1/2 taza de vino blanco', 'Vino blanco'), i('2 hojas de laurel', 'Laurel'), i('Tomillo', 'Tomillo'), i('5 pimientas enteras', 'Pimienta negra entera'),
    i('1/2 taza de arvejas', 'Arvejas'), i('1 rama de apio picada', 'Apio'), i('1 cdta de consomé', 'Consomé'), i('Aceite de oliva', 'Aceite de oliva virgen'), i('Sal', 'Sal'),
  ], [
    'Dora el pollo salado en aceite de oliva y sácalo.',
    'Sofríe cebolla, apio y ajo; luego el tomate hasta que se deshaga.',
    'Agrega el vino y deja que hierva 2 minutos.',
    'Regresa el pollo con laurel, tomillo, pimientas, consomé y 1 taza de agua. Tapa y cocina 20 minutos.',
    'Agrega las arvejas los últimos 5 minutos.',
  ]),
  r('Pollo al vinagre de manzana y comino', 'almuerzo', 30, 2, [
    i('2 pechugas abiertas en filete', 'Pechuga de pollo'), i('2 cdas de vinagre de manzana', 'Vinagre de manzana'), i('1 cdta de comino', 'Comino'),
    i('1 cdta de orégano', 'Orégano'), i('1 cdta de ajo en polvo', 'Ajo en polvo'), i('1 cdta de jugo Maggi', 'Jugo Maggi'),
    i('Aceite de aguacate', 'Aceite de aguacate'), i('Brócoli al ajo (ver receta)', 'Brócoli', true), ...sp(),
  ], [
    'Mezcla vinagre, comino, orégano, ajo, Maggi, sal y pimienta. Marina el pollo 20 minutos (máximo 2 horas).',
    'Cocina a la plancha con poco aceite, 5 minutos por lado sin moverlo.',
    'Deja reposar 3 minutos antes de cortar.',
  ]),
  r('Lasaña de carne con requesón', 'almuerzo', 75, 6, [
    i('12 láminas de lasaña', 'Lasaña'), i('500 g de carne molida', 'Carne molida'), i('1 frasco de salsa de tomate', 'Salsa de tomate en frasco'),
    i('1 cebolla picada', 'Cebolla'), i('3 dientes de ajo', 'Ajo'), i('Orégano y tomillo', 'Orégano'), i('1 hoja de laurel', 'Laurel'),
    i('400 g de requesón', 'Requesón'), i('1 huevo', 'Huevos'), i('200 g de queso panela rallado', 'Queso panela'), i('Champiñones picados', 'Champiñones', true),
    i('Aceite de oliva', 'Aceite de oliva virgen'), ...sp(),
  ], [
    'Sofríe cebolla y ajo, agrega la carne y dórala bien. Sazona.',
    'Echa la salsa de tomate, orégano, tomillo, laurel (y champiñones). Cocina 15 minutos.',
    'Mezcla el requesón con el huevo, sal y pimienta.',
    'En un refractario: salsa, láminas, requesón, carne. Repite 3 veces y termina con salsa y panela.',
    'Tapa con papel aluminio y hornea 30 minutos a 180 °C; destapa y hornea 15 más.',
    'Deja reposar 10 minutos antes de cortar.',
  ], 'Si las láminas son de las que se cuecen antes, hiérvelas 2 minutos menos de lo que dice el paquete.'),
  r('Fideo cabello a la boloñesa', 'almuerzo', 35, 4, [
    i('250 g de fideo cabello', 'Fideo cabello'), i('400 g de carne molida', 'Carne molida'), i('1 frasco de salsa de tomate', 'Salsa de tomate en frasco'),
    i('1/2 cebolla', 'Cebolla'), i('1 rama de apio', 'Apio'), i('2 dientes de ajo', 'Ajo'), i('1 hoja de laurel', 'Laurel'), i('Orégano y tomillo', 'Tomillo'),
    i('Chorrito de vino blanco', 'Vino blanco', true), i('Queso panela rallado', 'Queso panela'), i('Aceite de oliva', 'Aceite de oliva virgen'), ...sp(),
  ], [
    'Pica muy fino cebolla, apio y ajo; sofríe en aceite de oliva 5 minutos.',
    'Agrega la carne, sepárala con la cuchara y dórala. Echa el vino si usas.',
    'Añade la salsa, laurel, orégano y tomillo. Cocina 15 minutos a fuego bajo.',
    'Cuece el fideo (cocina rápido: 3–4 minutos).',
    'Sirve con la salsa y panela rallada.',
  ]),
  r('Albóndigas en salsa de tomate', 'almuerzo', 45, 4, [
    i('500 g de carne molida', 'Carne molida'), i('1 huevo', 'Huevos'), i('3 cdas de empanizador o avena', 'Empanizador'), i('1/2 cebolla rallada', 'Cebolla'),
    i('Cilantro picado', 'Cilantro'), i('1/2 cdta de comino', 'Comino'), i('1 frasco de salsa de tomate', 'Salsa de tomate en frasco'),
    i('1 cdta de consomé', 'Consomé'), i('Tallarín o macarrón para acompañar', 'Tallarín', true), ...sp(),
  ], [
    'Mezcla carne, huevo, empanizador, cebolla, cilantro, comino, sal y pimienta. Forma bolitas del tamaño de una nuez.',
    'Dóralas en sartén sin moverlas mucho.',
    'Agrega la salsa, el consomé y media taza de agua. Tapa y cocina 15 minutos.',
    'Sirve sobre pasta o con arroz.',
  ]),
  r('Carne molida salteada con verduras', 'almuerzo', 20, 3, [
    i('400 g de carne molida', 'Carne molida'), i('1 brócoli en arbolitos chicos', 'Brócoli'), i('1 taza de guisantes dulces', 'Guisantes dulces'),
    i('1/2 cebolla en juliana', 'Cebolla'), i('2 dientes de ajo', 'Ajo'), i('3 cdas de salsa de ostiones', 'Salsa de ostiones'), i('1 cdta de jugo Maggi', 'Jugo Maggi'),
    i('1 cdta de miel', 'Miel'), i('Cebollín', 'Cebollín'), i('Aceite de aguacate', 'Aceite de aguacate'),
  ], [
    'Dora la carne en sartén muy caliente y sácala.',
    'Saltea cebolla, ajo, brócoli y guisantes 3 minutos (que queden crujientes).',
    'Regresa la carne, agrega ostión, Maggi y miel. Mezcla 1 minuto.',
    'Termina con cebollín. Va bien sola, en tortilla o sobre fideos.',
  ]),
  r('Macarrones cremosos de espárragos con pollo', 'almuerzo', 30, 4, [
    i('250 g de macarrón', 'Macarrón'), i('1 sobre de crema de espárragos Maggi', 'Crema de espárragos Maggi'), i('1 pechuga en cubos', 'Pechuga de pollo'),
    i('6 champiñones', 'Champiñones'), i('1/2 taza de yogurt griego', 'Yogurt griego', true), i('Queso panela', 'Queso panela'), i('Ajo en polvo', 'Ajo en polvo'), ...sp(),
  ], [
    'Cuece el macarrón.',
    'Prepara la crema de espárragos con la mitad del agua que pide el sobre (que quede espesa).',
    'Dora el pollo con ajo en polvo, sal y pimienta; agrega los champiñones.',
    'Mezcla pasta, pollo y crema. Fuera del fuego agrega el yogurt.',
    'Termina con panela en cubitos.',
  ]),
  r('Tallarín con atún, tomate y orégano', 'almuerzo', 20, 2, [
    i('200 g de tallarín', 'Tallarín'), i('1 lata de atún', 'Atún'), i('2 tomates picados', 'Tomate'), i('2 dientes de ajo', 'Ajo'),
    i('1 cdta de orégano', 'Orégano'), i('Aceite de oliva extra virgen', 'Aceite de oliva extra virgen'), i('Cebollín', 'Cebollín', true), ...sp(),
  ], [
    'Cuece el tallarín.',
    'Dora el ajo en aceite de oliva, agrega el tomate y cocina 5 minutos.',
    'Añade el atún escurrido y el orégano; solo calienta.',
    'Mezcla con la pasta y termina con un hilo de aceite extra virgen.',
  ]),

  // ─── Cenas ───
  r('Tostadas de picadillo', 'cena', 30, 4, [
    i('8 tostadas', 'Tostadas'), i('300 g de carne molida', 'Carne molida'), i('1 tomate picado', 'Tomate'), i('1/2 cebolla picada', 'Cebolla'),
    i('1/2 taza de arvejas', 'Arvejas'), i('1 lata de frijol', 'Frijol en lata'), i('Cilantro', 'Cilantro'), i('Queso panela', 'Queso panela'),
    i('Comino', 'Comino'), i('Cebolla curtida (ver receta)', null, true), ...sp(),
  ], [
    'Dora la carne con cebolla, sal, pimienta y una pizca de comino.',
    'Agrega tomate y arvejas; cocina 8 minutos.',
    'Calienta y machaca el frijol.',
    'Arma: tostada, frijol, picadillo, queso, cilantro y cebolla curtida.',
  ]),
  r('Burritos de pollo y frijol', 'cena', 30, 4, [
    i('1 pechuga cocida y deshilachada', 'Pechuga de pollo'), i('4 tortillas de harina grandes', 'Tortillas de harina'), i('1 lata de frijol', 'Frijol en lata'),
    i('1/2 taza de salsa ranchera', 'Salsa Natura ranchera'), i('Queso panela', 'Queso panela'), i('Comino y paprika', 'Comino'), i('Cebolla', 'Cebolla'),
    i('Cilantro', 'Cilantro'), i('Yogurt griego', 'Yogurt griego', true), ...sp(),
  ], [
    'Sofríe cebolla, agrega el pollo con comino, paprika, sal y la salsa ranchera.',
    'Calienta las tortillas para que no se rompan.',
    'Rellena con frijol, pollo, queso y cilantro. Dobla los lados y enrolla.',
    'Dora el burrito en sartén con la unión hacia abajo para sellarlo.',
  ]),
  r('Quesadillas de pollo y panela', 'cena', 15, 2, [
    i('4 tortillas de harina', 'Tortillas de harina'), i('1 taza de pollo deshilachado', 'Pechuga de pollo'), i('100 g de queso panela rallado', 'Queso panela'),
    i('Champiñones salteados', 'Champiñones', true), i('Cebollín', 'Cebollín'), i('Ranch para mojar', 'Ranch'),
  ], [
    'Sobre una tortilla pon queso, pollo, cebollín (y champiñones) y otra tortilla.',
    'Dora en sartén a fuego medio-bajo, 2–3 minutos por lado.',
    'Corta en triángulos y sirve con ranch.',
  ], 'La panela no se derrite como el queso de hebra; queda suave y no se sale.'),
  r('Wrap de pollo con ranch', 'cena', 15, 2, [
    i('2 tortillas de harina', 'Tortillas de harina'), i('1 pechuga a la plancha en tiras', 'Pechuga de pollo'), i('Ranch', 'Ranch'),
    i('1 tomate en tiras', 'Tomate'), i('Apio en bastones finos', 'Apio'), i('Cebolla morada o blanca', 'Cebolla'), i('Queso panela', 'Queso panela'), i('Lechuga', 'Lechuga', true),
  ], [
    'Calienta la tortilla.',
    'Unta ranch y pon pollo, tomate, apio, cebolla y panela.',
    'Enrolla apretado y corta a la mitad en diagonal.',
  ]),
  r('Nachos con carne y frijol', 'cena', 20, 3, [
    i('1 bolsa de nachos', 'Nachos'), i('250 g de carne molida', 'Carne molida'), i('1/2 lata de frijol', 'Frijol en lata'), i('Salsa ranchera', 'Salsa Natura ranchera'),
    i('Queso panela', 'Queso panela'), i('Tomate, cebolla y cilantro picados', 'Tomate'), i('Comino y paprika', 'Paprika'), i('Yogurt griego', 'Yogurt griego', true), ...sp(),
  ], [
    'Dora la carne con comino, paprika, sal y pimienta.',
    'En una bandeja: nachos, frijol en cucharadas, carne y queso.',
    'Hornea 5 minutos a 200 °C (o 1 minuto en microondas).',
    'Termina con tomate, cebolla, cilantro, salsa y yogurt.',
  ]),
  r('Dobladas de masa con queso', 'cena', 30, 4, [
    i('2 tazas de masa', 'Masa'), i('150 g de queso panela', 'Queso panela'), i('Pizca de sal', 'Sal'), i('Salsa de tomate o ranchera', 'Salsa Natura ranchera'),
    i('Cebolla curtida (ver receta)', null, true), i('Aceite de aguacate', 'Aceite de aguacate'),
  ], [
    'Amasa la masa con sal y un poco de agua hasta que no se pegue en las manos.',
    'Haz tortillas delgadas, pon queso en la mitad y dobla apretando las orillas.',
    'Fríe en poco aceite hasta que estén doradas, o cocina en comal para versión ligera.',
    'Sirve con salsa y curtido.',
  ]),
  r('Tortillas de maíz hechas en casa', 'extra', 25, 4, [
    i('2 tazas de masa', 'Masa'), i('Agua tibia', null), i('Pizca de sal', 'Sal', true),
  ], [
    'Amasa con agua tibia hasta que la masa esté suave como plastilina.',
    'Haz bolitas y aplánalas entre dos plásticos.',
    'Comal bien caliente: 30 segundos, voltea, 1 minuto, voltea de nuevo hasta que se infle.',
    'Guárdalas en servilleta para que sigan suaves.',
  ]),
  r('Sándwich de ensalada de pollo', 'cena', 15, 2, [
    i('4 rebanadas de pan integral', 'Pan integral'), i('1 taza de pollo cocido picado', 'Pechuga de pollo'), i('3 cdas de yogurt griego', 'Yogurt griego'),
    i('1 cda de mayonesa', 'Mayonesa'), i('1 rama de apio picado fino', 'Apio'), i('Cebollín', 'Cebollín'), i('Tomate en rodajas', 'Tomate'), ...sp(),
  ], [
    'Mezcla pollo, yogurt, mayonesa, apio, cebollín, sal y pimienta.',
    'Tuesta el pan y arma con tomate.',
  ]),

  // ─── Sopas ───
  r('Sopa de pollo con fideo y verduras', 'sopa', 35, 4, [
    i('1 pechuga', 'Pechuga de pollo'), i('1 sobre de sopa Maggi de pollo con fideos', 'Sopa Maggi de pollo con fideos'), i('1 rama de apio', 'Apio'),
    i('1/2 brócoli', 'Brócoli'), i('1/2 cebolla', 'Cebolla'), i('1 tomate', 'Tomate'), i('Cilantro', 'Cilantro'), i('1 hoja de laurel', 'Laurel'), i('Limón', 'Limón', true),
  ], [
    'Cuece la pechuga en 6 tazas de agua con cebolla, apio y laurel, 20 minutos. Sácala y deshiláchala.',
    'Agrega al caldo el tomate picado y el brócoli; 5 minutos.',
    'Echa el sobre de sopa y cocina lo que diga el paquete.',
    'Regresa el pollo, apaga y agrega cilantro. Limón al servir.',
  ]),
  r('Caldo de pollo con verduras', 'sopa', 50, 4, [
    i('2 pechugas', 'Pechuga de pollo'), i('2 ramas de apio', 'Apio'), i('1 cebolla en cuartos', 'Cebolla'), i('3 dientes de ajo', 'Ajo'),
    i('1 tomate', 'Tomate'), i('1 cda de consomé', 'Consomé'), i('2 hojas de laurel', 'Laurel'), i('5 pimientas enteras', 'Pimienta negra entera'),
    i('1 clavo de olor', 'Clavo de olor'), i('Cilantro', 'Cilantro'), i('Papa y güisquil', 'Papa', true), i('Sal', 'Sal'),
  ], [
    'Pon todo menos el cilantro en una olla con 8 tazas de agua.',
    'Hierve y baja el fuego; cocina 35 minutos quitando la espuma.',
    'Saca el pollo, deshiláchalo y regrésalo.',
    'Ajusta de sal y agrega cilantro al final.',
  ]),
  r('Crema de espárragos con champiñones', 'sopa', 20, 3, [
    i('1 sobre de crema de espárragos Maggi', 'Crema de espárragos Maggi'), i('200 g de champiñones', 'Champiñones'), i('1 diente de ajo', 'Ajo'),
    i('Tomillo', 'Tomillo'), i('Aceite de oliva', 'Aceite de oliva virgen'), i('Pan integral tostado en cubos', 'Pan integral', true), i('Pimienta negra', 'Pimienta negra molida'),
  ], [
    'Prepara la crema como dice el sobre.',
    'Saltea los champiñones con ajo y tomillo hasta que estén dorados.',
    'Agrega la mitad a la crema y licúa si la quieres lisa; deja la otra mitad encima.',
    'Sirve con pimienta y crutones de pan integral.',
  ]),
  r('Sopa de tortilla', 'sopa', 30, 4, [
    i('6 tostadas en tiras', 'Tostadas'), i('3 tomates', 'Tomate'), i('1/2 cebolla', 'Cebolla'), i('2 dientes de ajo', 'Ajo'), i('1 cda de consomé', 'Consomé'),
    i('1/2 cdta de comino', 'Comino'), i('Pollo deshilachado', 'Pechuga de pollo', true), i('Queso panela en cubos', 'Queso panela'),
    i('Yogurt griego', 'Yogurt griego', true), i('Cilantro', 'Cilantro'), i('Aceite de aguacate', 'Aceite de aguacate'),
  ], [
    'Asa tomate, cebolla y ajo en comal. Licúa con 4 tazas de agua, consomé y comino.',
    'Fríe el licuado en una olla con un poco de aceite y cocina 15 minutos.',
    'Sirve sobre las tiras de tostada con panela, pollo, yogurt y cilantro.',
  ]),

  // ─── Rápidas ───
  r('Ensalada de macarrón con atún', 'rapida', 20, 4, [
    i('250 g de macarrón', 'Macarrón'), i('2 latas de atún', 'Atún'), i('3 cdas de mayonesa', 'Mayonesa'), i('2 cdas de yogurt griego', 'Yogurt griego'),
    i('2 ramas de apio picado', 'Apio'), i('1/4 de cebolla picada', 'Cebolla'), i('1/2 taza de arvejas cocidas', 'Arvejas'),
    i('1 cdta de vinagre de manzana', 'Vinagre de manzana'), i('Paprika para decorar', 'Paprika', true), ...sp(),
  ], [
    'Cuece el macarrón, escúrrelo y pásalo por agua fría.',
    'Mezcla mayonesa, yogurt, vinagre, sal y pimienta.',
    'Junta todo y refrigera 30 minutos si puedes.',
  ]),
  r('Sándwich de atún', 'rapida', 10, 2, [
    i('1 lata de atún', 'Atún'), i('2 cdas de mayonesa', 'Mayonesa'), i('Apio picado', 'Apio'), i('Cebolla picada', 'Cebolla'),
    i('4 rebanadas de pan integral', 'Pan integral'), i('Tomate', 'Tomate'), i('Gotas de vinagre o limón', 'Vinagre blanco', true), ...sp(),
  ], [
    'Mezcla el atún escurrido con mayonesa, apio, cebolla, sal y pimienta.',
    'Arma en pan integral tostado con tomate.',
  ]),
  r('Tostadas de atún', 'rapida', 10, 2, [
    i('4 tostadas', 'Tostadas'), i('1 lata de atún', 'Atún'), i('1 tomate picado', 'Tomate'), i('Cebolla y cilantro picados', 'Cilantro'),
    i('1 cda de mayonesa', 'Mayonesa'), i('Limón', 'Limón', true), ...sp(),
  ], [
    'Mezcla atún, tomate, cebolla, cilantro, mayonesa, sal y pimienta.',
    'Sirve sobre las tostadas justo antes de comer para que no se aguaden.',
  ]),
  r('Brócoli al ajo', 'rapida', 10, 2, [
    i('1 brócoli en arbolitos', 'Brócoli'), i('3 dientes de ajo en láminas', 'Ajo'), i('2 cdas de aceite de oliva', 'Aceite de oliva virgen'),
    i('Pepitoria', 'Pepitoria', true), ...sp(),
  ], [
    'Hierve el brócoli 2 minutos y pásalo a agua fría.',
    'Dora el ajo en el aceite a fuego bajo.',
    'Saltea el brócoli 2 minutos con sal y pimienta. Pepitoria encima.',
  ]),

  // ─── Postres ───
  r('Gelatina de yogurt con fresa', 'postre', 15, 6, [
    i('1 sobre (7 g) de gelatina sin sabor', 'Gelatina sin sabor'), i('2 tazas de yogurt griego', 'Yogurt griego'), i('3 cdas de miel', 'Miel'),
    i('1/2 taza de mermelada de fresa', 'Mermelada de fresa'), i('1/4 taza de agua', null),
  ], [
    'Hidrata la gelatina en el agua fría 5 minutos, luego derrítela 15 segundos en microondas (sin que hierva).',
    'Mezcla el yogurt con la miel y agrega la gelatina derretida, batiendo rápido.',
    'Sirve en vasitos, pon mermelada encima y refrigera 3 horas.',
  ]),
  r('Panna cotta de yogurt y miel', 'postre', 15, 4, [
    i('1 sobre de gelatina sin sabor', 'Gelatina sin sabor'), i('1 taza de leche', 'Leche'), i('1 taza de yogurt griego', 'Yogurt griego'),
    i('3 cdas de miel', 'Miel'), i('1 raja de canela', 'Canela'), i('Mermelada de fresa para la salsa', 'Mermelada de fresa'),
  ], [
    'Calienta la leche con canela y miel sin que hierva; saca la canela.',
    'Disuelve ahí la gelatina previamente hidratada.',
    'Deja entibiar y mezcla con el yogurt.',
    'Refrigera en moldes 4 horas. Sirve con mermelada aguadita con una cucharada de agua caliente.',
  ]),
  r('Atol de avena con canela', 'postre', 15, 3, [
    i('1/2 taza de avena', 'Avena'), i('4 tazas de agua o leche', null), i('1 raja de canela', 'Canela'), i('2 clavos de olor', 'Clavo de olor'),
    i('Azúcar al gusto', 'Azúcar'), i('Pizca de sal', 'Sal'),
  ], [
    'Licúa la avena con 2 tazas del líquido.',
    'Hierve el resto con canela y clavo.',
    'Agrega lo licuado y mueve sin parar 8 minutos hasta que espese.',
    'Endulza y sirve caliente.',
  ]),

  // ─── Extras ───
  r('Cebolla curtida', 'extra', 10, 8, [
    i('2 cebollas en aros finos', 'Cebolla'), i('1 taza de vinagre blanco', 'Vinagre blanco'), i('1/2 taza de agua', null), i('1 cdta de sal', 'Sal'),
    i('1 cdta de azúcar', 'Azúcar'), i('1 cdta de orégano', 'Orégano'), i('2 hojas de laurel', 'Laurel'), i('6 pimientas enteras', 'Pimienta negra entera'),
    i('2 clavos de olor', 'Clavo de olor'),
  ], [
    'Hierve vinagre, agua, sal, azúcar y las especias.',
    'Vierte caliente sobre la cebolla en un frasco de vidrio.',
    'Tapa y deja enfriar. Dura 2 semanas en la refri.',
  ], 'Sirve para tostadas, dobladas, burritos y casi todo lo de la semana.'),
  r('Vinagreta de la casa', 'extra', 5, 6, [
    i('1/2 taza de aceite de oliva extra virgen', 'Aceite de oliva extra virgen'), i('2 cdas de vinagre balsámico', 'Vinagre balsámico'),
    i('1 cda de vinagre de manzana', 'Vinagre de manzana'), i('1 cdta de miel', 'Miel'), i('1/2 cdta de ajo en polvo', 'Ajo en polvo'),
    i('Orégano', 'Orégano'), ...sp(),
  ], [
    'Pon todo en un frasco, tapa y agita fuerte.',
    'Dura una semana fuera de la refri.',
  ]),
  r('Dip de ranch y yogurt', 'extra', 5, 4, [
    i('1/2 taza de yogurt griego', 'Yogurt griego'), i('3 cdas de ranch', 'Ranch'), i('Cebollín picado', 'Cebollín'), i('Pizca de ajo en polvo', 'Ajo en polvo'),
  ], [
    'Mezcla todo y deja 10 minutos en la refri.',
    'Va con nachos, bastones de apio, brócoli o el pollo empanizado.',
  ]),
]
