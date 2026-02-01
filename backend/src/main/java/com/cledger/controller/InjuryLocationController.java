package com.cledger.controller;

import com.cledger.repository.SessionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/injury-locations")
public class InjuryLocationController {

    private final SessionRepository sessionRepository;

    public InjuryLocationController(SessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @GetMapping
    public ResponseEntity<List<String>> getInjuryLocations() {
        return ResponseEntity.ok(sessionRepository.findDistinctInjuryLocations());
    }
}
