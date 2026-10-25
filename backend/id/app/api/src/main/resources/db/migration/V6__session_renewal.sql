alter table sessions add column previous_token_hash varchar(255);
alter table sessions add column previous_token_valid_until timestamp with time zone;
alter table sessions add column token_issued_at timestamp with time zone;
update sessions set token_issued_at = created_at;
alter table sessions alter column token_issued_at set not null;
