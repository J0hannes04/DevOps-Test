package com.example.demo;

import java.time.Instant;

public record VaultItemResponse(
    Long id,
    String category,
    String ciphertext,
    String iv,
    Instant createdAt,
    Instant updatedAt
) {
    static VaultItemResponse from(VaultItem item) {
        return new VaultItemResponse(
            item.getId(),
            item.getCategory(),
            item.getCiphertext(),
            item.getIv(),
            item.getCreatedAt(),
            item.getUpdatedAt()
        );
    }
}
