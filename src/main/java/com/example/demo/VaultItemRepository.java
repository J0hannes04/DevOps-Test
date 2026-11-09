package com.example.demo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VaultItemRepository extends JpaRepository<VaultItem, Long> {
    List<VaultItem> findAllByUserOrderByUpdatedAtDesc(User user);
    Optional<VaultItem> findByIdAndUser(Long id, User user);
}
