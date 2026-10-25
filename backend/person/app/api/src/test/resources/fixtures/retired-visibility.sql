INSERT INTO content_privacy (id, person_id, kind, resource_id, visibility)
VALUES
    ('legacy-page', '00000000-0000-4000-8000-000000000001', 'PAGE', '00000000-0000-4000-8000-000000000001', 'HIDDEN'),
    ('legacy-description', '00000000-0000-4000-8000-000000000001', 'FIELD', 'description', 'HIDDEN'),
    ('legacy-comment', '00000000-0000-4000-8000-000000000001', 'COMMENT', '00000000-0000-4000-8000-000000000002', 'PERSONAL');

INSERT INTO content_privacy_recipients (privacy_id, account_id)
VALUES ('legacy-comment', '00000000-0000-4000-8000-000000000003');
