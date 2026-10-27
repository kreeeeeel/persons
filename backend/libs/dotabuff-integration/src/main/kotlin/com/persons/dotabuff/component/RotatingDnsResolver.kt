package com.persons.dotabuff.component

import org.apache.hc.client5.http.DnsResolver
import java.net.InetAddress
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.stream.IntStream

internal class RotatingDnsResolver(
    private val delegate: DnsResolver,
) : DnsResolver {
    private val attempts = ConcurrentHashMap<String, AtomicInteger>()

    override fun resolve(host: String): Array<InetAddress> {
        val addresses = delegate.resolve(host)
        if (addresses.size <= 1) {
            return addresses
        }
        // A successful TCP connection can still fail during TLS; the next attempt must try a different edge.
        val offset = Math.floorMod(attempts.computeIfAbsent(host) { AtomicInteger() }.getAndIncrement(), addresses.size)
        return IntStream
            .range(0, addresses.size)
            .mapToObj { addresses[(it + offset) % addresses.size] }
            .toArray { arrayOfNulls<InetAddress>(it) }
    }

    override fun resolveCanonicalHostname(host: String): String = delegate.resolveCanonicalHostname(host)
}
