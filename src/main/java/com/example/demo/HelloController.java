package com.example.demo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/")
    public String home() {
        return "Willkommen im DevOps-Projekt! Die CI/CD-Pipeline laeuft automatisch!";
    }

    @GetMapping("/team")
    public String team() {
        return "Hier entsteht die Team-Seite unseres DevOps-Projekts!";
    }
}