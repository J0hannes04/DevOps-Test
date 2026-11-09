package com.example.demo;

public record VaultConfigResponse(String salt, String verifier, String verifierIv) {
}
