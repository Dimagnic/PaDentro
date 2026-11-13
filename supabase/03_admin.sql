-- Da acceso al panel /admin a una cuenta.
-- 1) Primero crea el usuario en: Authentication > Users > Add user > Create new user
--    (pon correo y contraseña y marca "Auto Confirm User").
-- 2) Cambia el correo de abajo por el de esa cuenta y ejecuta:
insert into public.admins (email) values ('tu-correo@ejemplo.com')
on conflict do nothing;

-- Para quitarle el acceso a alguien:
-- delete from public.admins where email = 'correo@ejemplo.com';
