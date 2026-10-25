local raw = redis.call('HGET', KEYS[1], ARGV[1])
if not raw then return redis.error_reply('DYN_UNKNOWN_KEY') end
local record = cjson.decode(raw)
if ARGV[2] ~= '' and record.revision ~= tonumber(ARGV[2]) then
    return redis.error_reply('DYN_CONFLICT')
end
record.value, record.updatedAt, record.updatedBy = ARGV[3], ARGV[4], ARGV[5]
record.revision = redis.call('INCR', KEYS[2])
local updated = cjson.encode(record)
redis.call('HSET', KEYS[1], ARGV[1], updated)
redis.call('PUBLISH', KEYS[3], cjson.encode({records={record}}))
return updated
