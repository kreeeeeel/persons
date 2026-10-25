local result = {fullSnapshot=true, revision=tonumber(redis.call('GET', KEYS[2]) or '0')}
local records = redis.call('HVALS', KEYS[1])
if #records > 0 then
    result.records = {}
    for _, raw in ipairs(records) do table.insert(result.records, cjson.decode(raw)) end
end
return cjson.encode(result)
