local records, owners, scopes, revision, channel = KEYS[1], KEYS[2], KEYS[3], KEYS[4], KEYS[5]
local scope, definitions, now = ARGV[1], cjson.decode(ARGV[2]), ARGV[3]
local active = {}
for _, definition in ipairs(definitions) do active[definition.key] = true end
local previous = cjson.decode(redis.call('HGET', scopes, scope) or '[]')
for _, key in ipairs(previous) do
    if not active[key] then
        local linked = cjson.decode(redis.call('HGET', owners, key) or '{}')
        linked[scope] = nil
        if next(linked) == nil then
            redis.call('HDEL', records, key)
            redis.call('HDEL', owners, key)
            local deletedRevision = redis.call('INCR', revision)
            redis.call('PUBLISH', channel, cjson.encode({removed={key}, revision=deletedRevision}))
        else
            redis.call('HSET', owners, key, cjson.encode(linked))
        end
    end
end
local scopeKeys = {}
for _, definition in ipairs(definitions) do
    table.insert(scopeKeys, definition.key)
    local linked = cjson.decode(redis.call('HGET', owners, definition.key) or '{}')
    linked[scope] = true
    redis.call('HSET', owners, definition.key, cjson.encode(linked))
    local raw = redis.call('HGET', records, definition.key)
    local old = raw and cjson.decode(raw) or nil
    local reset = not old or old.definition.type ~= definition.type
        or old.definition.defaultValue ~= definition.defaultValue
        or cjson.encode(old.definition.schema) ~= cjson.encode(definition.schema)
    local changed = reset or old.definition.description ~= definition.description
        or old.definition.publicValue ~= definition.publicValue
    if changed then
        local record = {definition=definition, value=reset and definition.defaultValue or old.value,
            revision=redis.call('INCR', revision), updatedAt=now}
        redis.call('HSET', records, definition.key, cjson.encode(record))
        redis.call('PUBLISH', channel, cjson.encode({records={record}}))
    end
end
redis.call('HSET', scopes, scope, cjson.encode(scopeKeys))
return redis.call('HVALS', records)
