package com.example.demo;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.stereotype.Component;

@Component
public class LoginRateLimiter {

    private static final int MAX_ATTEMPTS = 5;
    private static final Duration WINDOW = Duration.ofMinutes(15);

    private final ConcurrentHashMap<String, AttemptWindow> attempts = new ConcurrentHashMap<>();

    public boolean isAllowed(String key) {
        Instant now = Instant.now();
        AttemptWindow window = attempts.compute(key, (ignored, current) -> {
            if (current == null || current.expiresAt().isBefore(now)) {
                return new AttemptWindow(now.plus(WINDOW), new AtomicInteger(0));
            }
            return current;
        });
        return window.count().get() < MAX_ATTEMPTS;
    }

    public void recordFailure(String key) {
        AttemptWindow window = attempts.get(key);
        if (window != null) {
            window.count().incrementAndGet();
        }
    }

    public void reset(String key) {
        attempts.remove(key);
    }

    private record AttemptWindow(Instant expiresAt, AtomicInteger count) {
    }
}
