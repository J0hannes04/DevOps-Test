package com.example.demo;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class HelloControllerTest {

    @Test
    void shouldReturnWelcomeMessage() {
        // 1. Wir erstellen einfach manuell eine Instanz deines Controllers
        HelloController controller = new HelloController();

        // 2. Wir rufen die Methode direkt auf
        String result = controller.home();

        // 3. Wir prüfen, ob der Text exakt übereinstimmt
        assertEquals("Willkommen im DevOps-Projekt! Die CI/CD-Pipeline laeuft automatisch!", result);
    }

    @Test
    void shouldReturnTeamMessage() {
        HelloController controller = new HelloController();
        assertEquals("Hier entsteht die Team-Seite unseres DevOps-Projekts!", controller.team());
    }
}