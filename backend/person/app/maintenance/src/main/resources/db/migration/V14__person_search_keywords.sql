create table person_search_keywords (
    id uuid primary key,
    person_id uuid not null references persons(id) on delete cascade,
    keyword varchar(80) not null,
    position integer not null,
    constraint uq_person_search_keyword unique (person_id, keyword)
);
