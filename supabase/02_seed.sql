-- Carga inicial de la carta (251 productos) y promociones.
-- Ejecutar después de 01_schema.sql. Borra y recarga la carta completa.
begin;
delete from public.menu_categories;
insert into public.menu_categories (tab, note, sort) values ('Mesa Poblana', 'Beneficio de la casa: disfruta los alimentos de Mesa Poblana sin costo al acumular $350 o más por persona en bebidas alcohólicas, no alcohólicas, café y/o postres participantes, durante la misma visita. No acumulable con otras promociones.', 0);
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Antojitos poblanos', '', 0 from public.menu_categories where tab = 'Mesa Poblana';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Chalupas', 50, null, '', 0),
  ('Chancla (1 pieza)', 60, null, '', 1),
  ('Tostada de pata (1 pieza)', 50, null, '', 2),
  ('Pelona (1 pieza)', 80, null, '', 3)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Mesa Poblana' and ms.title = 'Antojitos poblanos') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Sopas y caldos', '', 1 from public.menu_categories where tab = 'Mesa Poblana';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Chileatole (300 ml)', 65, null, '', 0),
  ('Sopa de cebolla (300 ml)', 65, null, '', 1),
  ('Caldo de piedra (350 ml)', 90, null, '', 2)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Mesa Poblana' and ms.title = 'Sopas y caldos') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Platillos fuertes', '', 2 from public.menu_categories where tab = 'Mesa Poblana';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Enchiladas verdes con pollo', 130, null, '', 0),
  ('Mole de guayaba con costilla', 130, null, '', 1),
  ('Chile capones (200 g)', 130, null, '', 2),
  ('Crepas de tinga poblana bañadas en salsa de queso (200 g)', 130, null, '', 3),
  ('Mole poblano con guajolote o pollo (200 g)', 180, null, '', 4)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Mesa Poblana' and ms.title = 'Platillos fuertes') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Platillos de temporada', 'No participan en el beneficio Mesa Poblana', 3 from public.menu_categories where tab = 'Mesa Poblana';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Chamorro en salsa borracha (200 g)', 220, null, '', 0),
  ('Chile en nogada (1 pieza)', 350, null, '', 1),
  ('Mole de caderas', null, null, 'Próximamente', 2)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Mesa Poblana' and ms.title = 'Platillos de temporada') s;
insert into public.menu_categories (tab, note, sort) values ('Antojería', '', 1);
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Antojitos', '', 0 from public.menu_categories where tab = 'Antojería';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('2 tlacoyos de alberjón', 30, null, '', 0),
  ('Memela', 30, null, '', 1),
  ('Chalupa (orden 4)', 25, null, '', 2),
  ('Quesadilla', 45, null, '', 3),
  ('Tacos de guisado', 45, null, '', 4),
  ('Omelet', 95, null, '', 5),
  ('Huevos al gusto', 85, null, '', 6),
  ('Tostada de pollo o pata (orden 1)', 25, null, '', 7),
  ('Tacos dorados de papa (orden 3)', 45, null, '', 8),
  ('Pan dulce', 25, null, '', 9),
  ('Concha con nata', 45, null, '', 10)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Antojería' and ms.title = 'Antojitos') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Bebidas', '', 1 from public.menu_categories where tab = 'Antojería';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Atole', 30, null, '', 0),
  ('Café de olla', 30, null, '', 1),
  ('Refrescos (Coca-Cola, Fanta, Sprite, Fresca, Mundet)', 30, null, '', 2),
  ('Jugo del Valle', 45, null, '', 3),
  ('Agua', 30, null, '', 4)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Antojería' and ms.title = 'Bebidas') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Extras', '', 2 from public.menu_categories where tab = 'Antojería';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('1 huevo', 10, null, '', 0),
  ('Longaniza', 10, null, '', 1),
  ('Quesillo', 10, null, '', 2),
  ('Bistec', 25, null, '', 3)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Antojería' and ms.title = 'Extras') s;
insert into public.menu_categories (tab, note, sort) values ('Café y postres', '', 2);
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Café de especialidad', '', 0 from public.menu_categories where tab = 'Café y postres';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Coffee tonic', 110, null, '', 0),
  ('Affogato al caffè', 120, null, '', 1),
  ('Carajillo, el rey de México', 160, null, '', 2),
  ('Carajillo Real, traído del viejo mundo', 179, null, '', 3),
  ('Bombón, de la familia de los carajillos', 179, null, '', 4),
  ('Expresso martini, elegante', 185, null, '', 5),
  ('Café irlandés, clásico', 190, null, '', 6)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Café y postres' and ms.title = 'Café de especialidad') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Café', '', 1 from public.menu_categories where tab = 'Café y postres';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Americano (360 ml)', 61, null, '', 0),
  ('Expresso (45 ml)', 61, null, '', 1),
  ('Expresso cortado (45 ml)', 72, null, '', 2),
  ('Capuccino', 72, null, '', 3)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Café y postres' and ms.title = 'Café') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Postres', '', 2 from public.menu_categories where tab = 'Café y postres';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Helado de chocolate o vainilla', 70, null, '', 0),
  ('Carlota de limón', 75, null, '', 1),
  ('Plátano macho con lechera', 65, null, '', 2),
  ('Pan de elote con helado', 100, null, '', 3),
  ('Pan de elote con rompope artesanal', 110, null, '', 4),
  ('Duraznos en almíbar con rompope artesanal', 110, null, '', 5),
  ('Ate con queso flameado', 180, null, '', 6),
  ('Pay de temporada', 150, null, '', 7)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Café y postres' and ms.title = 'Postres') s;
insert into public.menu_categories (tab, note, sort) values ('Coctelería', 'Personaliza tu coctel: preparamos cualquier coctel de la casa con el destilado de tu preferencia, con un costo extra de $60 MXN sobre el precio de la copa del destilado elegido.', 3);
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Coctelería de la casa', '', 0 from public.menu_categories where tab = 'Coctelería';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('La niña, paloma de achiote y maíz', 155, null, '', 0),
  ('Sor María de la Cruz, margarita de jamaica negra', 155, null, '', 1),
  ('La llorona poblana, mezcal sour de mora azul', 155, null, '', 2),
  ('La mujer del patio, mezcalina de piña flameada o tatemada', 155, null, '', 3),
  ('Sabor a México, mezcal con jamaica y piña', 155, null, '', 4),
  ('Campo verde, licor de manzana y maracuyá', 155, null, '', 5),
  ('Ave fénix, mezcal con aperol y arándano', 185, null, '', 6)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Coctelería' and ms.title = 'Coctelería de la casa') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Coctelería', '', 1 from public.menu_categories where tab = 'Coctelería';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Tinto de verano', 90, null, '', 0),
  ('Muppet', 98, null, '', 1),
  ('Clamato natural', 109, null, '', 2),
  ('Desarmador', 121, null, '', 3),
  ('Medias de seda', 121, null, '', 4),
  ('Mezcalina (mango, maracuyá o jamaica)', 123, null, '', 5),
  ('Clamato con alcohol', 127, null, '', 6),
  ('Tom Collins', 127, null, '', 7),
  ('Piedra', 127, null, '', 8),
  ('Margarita', 127, null, '', 9),
  ('Sangría preparada', 127, null, '', 10),
  ('Azteca de oro', 127, null, '', 11),
  ('Piña colada', 127, null, '', 12),
  ('Bloody Mary', 138, null, '', 13),
  ('Aperol Spritz', 149, null, '', 14),
  ('Menyul', 164, null, '', 15),
  ('Negroni', 176, null, '', 16),
  ('Niño de oro', 179, null, '', 17),
  ('ABC', 208, null, '', 18)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Coctelería' and ms.title = 'Coctelería') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Mocktails', '', 2 from public.menu_categories where tab = 'Coctelería';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Frutal fresh', 100, null, '', 0),
  ('Piña colada sin alcohol', 100, null, '', 1),
  ('Limonada eléctrica', 100, null, '', 2),
  ('Jam jam', 135, null, '', 3),
  ('Conga', 121, null, '', 4)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Coctelería' and ms.title = 'Mocktails') s;
insert into public.menu_categories (tab, note, sort) values ('Sin alcohol y cerveza', '', 4);
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Cervezas', '', 0 from public.menu_categories where tab = 'Sin alcohol y cerveza';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Corona Extra (355 ml)', 82, null, '', 0),
  ('Victoria (355 ml)', 82, null, '', 1),
  ('Negra Modelo (355 ml)', 95, null, '', 2),
  ('Modelo Especial (355 ml)', 95, null, '', 3),
  ('Stella Artois (330 ml)', 95, null, '', 4)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Sin alcohol y cerveza' and ms.title = 'Cervezas') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Bebidas', '', 1 from public.menu_categories where tab = 'Sin alcohol y cerveza';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Botella de agua (355 ml)', 80, null, '', 0),
  ('Agua mineral (355 ml)', 80, null, '', 1),
  ('Coca-Cola, Light o Zero (355 ml)', 80, null, '', 2),
  ('Sprite (355 ml)', 80, null, '', 3),
  ('Fanta naranja (355 ml)', 80, null, '', 4),
  ('Sidral de manzana (355 ml)', 80, null, '', 5),
  ('Ginger ale (355 ml)', 80, null, '', 6),
  ('Squirt (355 ml)', 80, null, '', 7),
  ('Fresca (355 ml)', 80, null, '', 8),
  ('Topo Chico (355 ml)', 80, null, '', 9),
  ('Rusa (365 ml)', 82, null, '', 10),
  ('Agua quina (296 ml)', 82, null, '', 11),
  ('Limonada natural o mineral (360 ml)', 82, null, '', 12),
  ('Naranjada natural o mineral (360 ml)', 82, null, '', 13)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Sin alcohol y cerveza' and ms.title = 'Bebidas') s;
insert into public.menu_categories (tab, note, sort) values ('Destilados y vinos', 'Las botellas incluyen 4 mezcladores de 355 ml.', 5);
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Cognac', 'Copa 45 ml · botella', 0 from public.menu_categories where tab = 'Destilados y vinos';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Martell VSOP', 210, 2550, '', 0),
  ('Hennessy VSOP', 295, 4500, '', 1)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Destilados y vinos' and ms.title = 'Cognac') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Mezcal', 'Copa 60 ml · botella', 1 from public.menu_categories where tab = 'Destilados y vinos';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Ojo de Tigre', 150, 1950, '', 0),
  ('400 Conejos Blanco', 145, 1650, '', 1),
  ('7 Deseos Espadín Tobalá', 220, 2750, '', 2),
  ('7 Deseos Espadín', 145, 1850, '', 3),
  ('Promesa J. Espadín', 135, 1600, '', 4),
  ('7 Deseos Ensamble', 195, 2350, '', 5),
  ('Espadín Joven Artesanal', 165, 2100, '', 6),
  ('Espadín Negro Artesanal', 165, 2000, '', 7),
  ('Espadín Pechuga y Mole Artesanal', 220, 2650, '', 8),
  ('Papalometl Artesanal', 225, 2600, '', 9),
  ('Espadín Cuishe Artesanal', 245, 2900, '', 10),
  ('Mexicano Artesanal', 245, 2900, '', 11),
  ('Triple Ensamble Artesanal', 265, 3150, '', 12),
  ('Arroqueño Artesanal', 265, 3150, '', 13),
  ('Tepeztate Artesanal', 265, 3150, '', 14),
  ('Amarás Espadín Reposado', 175, 2150, '', 15)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Destilados y vinos' and ms.title = 'Mezcal') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Tequila', 'Copa 45 ml · botella', 2 from public.menu_categories where tab = 'Destilados y vinos';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Herradura Blanco', 165, 2550, '', 0),
  ('Herradura Reposado', 175, 2350, '', 1),
  ('Herradura Plata', 165, 1750, '', 2),
  ('Herradura Ultra Añejo', 190, 2300, '', 3),
  ('Herradura Añejo', 240, 3250, '', 4),
  ('Herradura Antiguo Reposado', 135, 1150, '', 5),
  ('Cazadores', 125, 1390, '', 6),
  ('Hornitos Reposado', 120, 1250, '', 7),
  ('Cuervo Tradicional Reposado', 125, 1450, '', 8),
  ('Cuervo Tradicional Plata', 125, 1450, '', 9),
  ('1800 Blanco', 170, 1750, '', 10),
  ('1800 Reposado', 175, 1850, '', 11),
  ('1800 Cristalino', 200, 2400, '', 12),
  ('1800 Añejo', 210, 2350, '', 13),
  ('Don Julio Blanco', 195, 2100, '', 14),
  ('Don Julio Reposado', 210, 2490, '', 15),
  ('Don Julio 70', 250, 3150, '', 16),
  ('Don Julio Añejo', 250, 3250, '', 17),
  ('Centenario Plata', 125, 1450, '', 18),
  ('Centenario Reposado', 125, 1450, '', 19),
  ('Maestro Dobel Diamante', 185, 2150, '', 20),
  ('7 Leguas Blanco', 160, 2400, '', 21)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Destilados y vinos' and ms.title = 'Tequila') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Whisky', 'Copa 45 ml · botella', 3 from public.menu_categories where tab = 'Destilados y vinos';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Jack Daniel''s', 135, 1455, '', 0),
  ('Jack Daniel''s Honey', 140, 1500, '', 1),
  ('Black White', 105, 1035, '', 2),
  ('Buchanan''s 12', 200, 2700, '', 3),
  ('Buchanan''s Pineapple', 200, 2950, '', 4),
  ('Buchanan''s Master', 240, 3509, '', 5),
  ('Buchanan''s 18', 420, 6292, '', 6),
  ('Buchanan''s Two Souls', 190, 2750, '', 7),
  ('Chivas Regal 12', 145, 1950, '', 8),
  ('Chivas Regal 18', 349, 4890, '', 9),
  ('JB', 110, 1200, '', 10),
  ('Passport', 100, 995, '', 11),
  ('Macallan 12 Double Black', 345, 4950, '', 12),
  ('Glenfiddich 12', 225, 3250, '', 13),
  ('Jameson', 120, 1379, '', 14),
  ('Old Parr', 185, 2350, '', 15),
  ('JW Double Black', 265, 3950, '', 16),
  ('JW Etiqueta Negra', 225, 3350, '', 17),
  ('JW Etiqueta Roja', 130, 1450, '', 18)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Destilados y vinos' and ms.title = 'Whisky') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Ron', 'Copa 45 ml · botella', 4 from public.menu_categories where tab = 'Destilados y vinos';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Appleton Blanco', 100, 1100, '', 0),
  ('Appleton Especial', 100, 1150, '', 1),
  ('Appleton Estate', 105, 1087, '', 2),
  ('Appleton 8 años', 135, 1650, '', 3),
  ('Bacardi Blanco', 100, 1200, '', 4),
  ('Bacardi Añejo', 115, 1400, '', 5),
  ('Bacardi Solera', 120, 1320, '', 6),
  ('Bacardi Limón', 105, 1100, '', 7),
  ('Bacardi 8 años', 205, 2450, '', 8),
  ('Matusalem Platino', 105, 1200, '', 9),
  ('Matusalem Clásico', 129, 1350, '', 10),
  ('Matusalem Gran Reserva', 145, 1670, '', 11),
  ('Flor de Caña 4 Extra Dry', 110, 1050, '', 12),
  ('Flor de Caña Gran Reserva', 135, 1506, '', 13),
  ('Flor de Caña Centenario 12', 185, 2400, '', 14),
  ('Flor Gold 4', 105, 1035, '', 15),
  ('Havana Añejo 3 años', 100, 950, '', 16),
  ('Havana 7 años', 135, 1400, '', 17),
  ('Malibú', 100, 1000, '', 18),
  ('Zacapa Centenario Sol', 235, 3150, '', 19),
  ('Botran', 145, 1639, '', 20),
  ('Antillano Blanco', 100, 1000, '', 21),
  ('Capitán Morgan', 100, 1024, '', 22),
  ('Kraken Black', 100, 950, '', 23)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Destilados y vinos' and ms.title = 'Ron') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Brandy', 'Copa 45 ml · botella', 5 from public.menu_categories where tab = 'Destilados y vinos';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Magno', 130, 1050, '', 0),
  ('Alma de Magno', 160, 1600, '', 1),
  ('Torres 5', 120, 1087, '', 2),
  ('Torres 10', 140, 1352, '', 3),
  ('Torres 15', 175, 1995, '', 4),
  ('Torres 20', 285, 3650, '', 5),
  ('Terry Centenario', 135, 1133, '', 6),
  ('Cardenal Mendoza', 249, 3350, '', 7),
  ('Fundador', 120, 1012, '', 8),
  ('Azteca de Oro', 120, 1035, '', 9),
  ('Carlos I', 215, 2550, '', 10)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Destilados y vinos' and ms.title = 'Brandy') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Ginebra', 'Copa 45 ml · botella', 6 from public.menu_categories where tab = 'Destilados y vinos';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Tanqueray', 170, 1950, '', 0),
  ('Beefeater', 145, 1400, '', 1),
  ('Beefeater Blackberry', 175, 1885, '', 2),
  ('Larios', 140, 1000, '', 3),
  ('Hendrick''s', 225, 2850, '', 4)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Destilados y vinos' and ms.title = 'Ginebra') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Vodka', 'Copa 45 ml · botella', 7 from public.menu_categories where tab = 'Destilados y vinos';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Absolut Azul', 100, 1035, '', 0),
  ('Absolut Citron', 100, 1035, '', 1),
  ('Absolut Mandarina', 100, 1035, '', 2),
  ('Wyborowa', 95, 950, '', 3),
  ('Smirnoff', 105, 1300, '', 4),
  ('Smirnoff Tamarindo o Electric Guava', 100, 1150, '', 5),
  ('Grey Goose', 185, 2290, '', 6),
  ('Stolichnaya', 125, 1400, '', 7)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Destilados y vinos' and ms.title = 'Vodka') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Digestivos', 'Copa 60 ml', 8 from public.menu_categories where tab = 'Destilados y vinos';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Chinchón dulce', 98, null, '', 0),
  ('Chinchón seco', 98, null, '', 1),
  ('Baileys', 115, null, '', 2),
  ('Anís Mico', 94, null, '', 3),
  ('Amaretto Disaronno', 145, null, '', 4),
  ('Chartreuse verde', 335, null, '', 5),
  ('Frangelico', 119, null, '', 6),
  ('Kahlúa', 75, null, '', 7),
  ('Licor 43', 125, null, '', 8),
  ('Midori', 115, null, '', 9),
  ('Stregal', 220, null, '', 10),
  ('Cointreau', 160, null, '', 11),
  ('Campari Bitter', 100, null, '', 12),
  ('Dubonnet Imperial', 95, null, '', 13),
  ('Fernet Branca', 150, null, '', 14),
  ('Fernet Wind', 75, null, '', 15),
  ('Jerez Tío Pepe', 109, null, '', 16),
  ('Cinzano Blanco Dry', 85, null, '', 17),
  ('Cinzano Rojo Rosso', 85, null, '', 18),
  ('Martini Blanco dulce', 115, null, '', 19),
  ('Martini Extra Dry', 135, null, '', 20),
  ('Martini Rossi Rojo', 100, null, '', 21),
  ('Jägermeister', 135, null, '', 22),
  ('Crema de casis de Dijon', 115, null, '', 23),
  ('Oporto Ferreira Tawny', 145, null, '', 24),
  ('Sambuca Vaccari Blanco', 94, null, '', 25),
  ('Sambuca Vaccari Negro', 100, null, '', 26),
  ('Rompope Santa Clara', 80, null, '', 27),
  ('Anís de la Abuelita artesanal', 90, null, '', 28),
  ('Rompope de la Abuelita artesanal', 66, null, '', 29)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Destilados y vinos' and ms.title = 'Digestivos') s;
insert into public.menu_sections (category_id, title, sub, sort) select id, 'Vinos', 'Botella 750 ml · convierte tu vino en clericot sin costo extra', 9 from public.menu_categories where tab = 'Destilados y vinos';
insert into public.menu_items (section_id, name, price, bottle_price, label, sort)
select s.id, v.name, v.price::numeric, v.bottle::numeric, v.label, v.sort from (values
  ('Santa Digna Rosa', 990, null, '', 0),
  ('Lambrusco Dolce Amore', 700, null, '', 1),
  ('Blue Rhin Liebfraumilch', 800, null, '', 2),
  ('Zinfandel', 900, null, '', 3),
  ('Petite Sirah', 900, null, '', 4),
  ('Tomas ST Cab', 1050, null, '', 5),
  ('Tomas ST Merlot', 1150, null, '', 6),
  ('Nebbiolo', 1200, null, '', 7),
  ('Cetto B Zinfandel Rosado', 799, null, '', 8),
  ('Lambrusco Rosado Dolce', 799, null, '', 9)
) as v(name, price, bottle, label, sort)
cross join lateral (select ms.id from public.menu_sections ms join public.menu_categories mc on mc.id = ms.category_id where mc.tab = 'Destilados y vinos' and ms.title = 'Vinos') s;

delete from public.promos;
insert into public.promos (label, title, description, sort) values ('Jueves y viernes', 'De Bandidas', 'Toda la coctelería al 2x1.', 0);
commit;
