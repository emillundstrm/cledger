package com.cledger.controller;

import com.cledger.dto.InsightRequest;
import com.cledger.dto.InsightResponse;
import com.cledger.service.InsightService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/insights")
public class InsightController {

    private final InsightService insightService;

    public InsightController(InsightService insightService) {
        this.insightService = insightService;
    }

    @GetMapping
    public ResponseEntity<List<InsightResponse>> getAllInsights() {
        return ResponseEntity.ok(insightService.getAllInsights());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InsightResponse> getInsight(@PathVariable UUID id) {
        return ResponseEntity.ok(insightService.getInsight(id));
    }

    @PostMapping
    public ResponseEntity<InsightResponse> createInsight(@Valid @RequestBody InsightRequest request) {
        InsightResponse response = insightService.createInsight(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<InsightResponse> updateInsight(
            @PathVariable UUID id,
            @Valid @RequestBody InsightRequest request) {
        return ResponseEntity.ok(insightService.updateInsight(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInsight(@PathVariable UUID id) {
        insightService.deleteInsight(id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(InsightService.InsightNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(InsightService.InsightNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
            fieldErrors.put(error.getField(), error.getDefaultMessage())
        );
        Map<String, Object> body = new HashMap<>();
        body.put("error", "Validation failed");
        body.put("fields", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }
}
