alter table persons add column birth_date date;
alter table persons add column military_departure_date date;
alter table persons add column military_return_date date;

alter table persons add constraint ck_person_military_dates check (
    military_return_date is null or
    (military_departure_date is not null and military_return_date > military_departure_date)
);
alter table persons add constraint ck_person_birth_departure check (
    birth_date is null or military_departure_date is null or military_departure_date > birth_date
);

create index ix_person_media_gallery on person_media (person_id, status, kind, created_at desc, id desc);
