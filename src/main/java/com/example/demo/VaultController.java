package com.example.demo;

import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vault")
public class VaultController {

    private final UserRepository userRepository;
    private final VaultItemRepository vaultItemRepository;

    public VaultController(UserRepository userRepository, VaultItemRepository vaultItemRepository) {
        this.userRepository = userRepository;
        this.vaultItemRepository = vaultItemRepository;
    }

    @GetMapping("/config")
    public ResponseEntity<VaultConfigResponse> config(@AuthenticationPrincipal String username) {
        User user = findUser(username);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        String salt = user.getVaultSalt();
        userRepository.save(user);
        return ResponseEntity.ok(new VaultConfigResponse(salt, user.getVaultVerifier(), user.getVaultVerifierIv()));
    }

    @PutMapping("/config")
    public ResponseEntity<Void> saveConfig(
        @Valid @RequestBody VaultConfigRequest request,
        @AuthenticationPrincipal String username
    ) {
        User user = findUser(username);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        if (user.getVaultVerifier() != null) {
            return ResponseEntity.badRequest().build();
        }
        user.setVaultVerifier(request.getVerifier());
        user.setVaultVerifierIv(request.getVerifierIv());
        userRepository.save(user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/items")
    public ResponseEntity<List<VaultItemResponse>> list(@AuthenticationPrincipal String username) {
        User user = findUser(username);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(vaultItemRepository.findAllByUserOrderByUpdatedAtDesc(user)
            .stream()
            .map(VaultItemResponse::from)
            .toList());
    }

    @PostMapping("/items")
    public ResponseEntity<VaultItemResponse> create(
        @Valid @RequestBody VaultItemRequest request,
        @AuthenticationPrincipal String username
    ) {
        User user = findUser(username);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        VaultItem item = new VaultItem();
        item.setUser(user);
        item.setCategory(request.getCategory());
        item.setCiphertext(request.getCiphertext());
        item.setIv(request.getIv());
        return ResponseEntity.ok(VaultItemResponse.from(vaultItemRepository.save(item)));
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<VaultItemResponse> update(
        @PathVariable Long id,
        @Valid @RequestBody VaultItemRequest request,
        @AuthenticationPrincipal String username
    ) {
        User user = findUser(username);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return vaultItemRepository.findByIdAndUser(id, user)
            .map(item -> {
                item.setCategory(request.getCategory());
                item.setCiphertext(request.getCiphertext());
                item.setIv(request.getIv());
                return ResponseEntity.ok(VaultItemResponse.from(vaultItemRepository.save(item)));
            })
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, @AuthenticationPrincipal String username) {
        User user = findUser(username);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return vaultItemRepository.findByIdAndUser(id, user)
            .map(item -> {
                vaultItemRepository.delete(item);
                return ResponseEntity.noContent().<Void>build();
            })
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private User findUser(String username) {
        return username == null ? null : userRepository.findByUsername(username);
    }
}
