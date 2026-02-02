package com.cledger.service;

import com.cledger.dto.InsightRequest;
import com.cledger.dto.InsightResponse;
import com.cledger.entity.CoachInsight;
import com.cledger.repository.CoachInsightRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class InsightService {

    private final CoachInsightRepository insightRepository;

    public InsightService(CoachInsightRepository insightRepository) {
        this.insightRepository = insightRepository;
    }

    @Transactional(readOnly = true)
    public List<InsightResponse> getAllInsights() {
        return insightRepository.findAllByOrderByPinnedDescUpdatedAtDesc()
            .stream()
            .map(InsightResponse::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public InsightResponse getInsight(UUID id) {
        CoachInsight insight = insightRepository.findById(id)
            .orElseThrow(() -> new InsightNotFoundException(id));
        return InsightResponse.fromEntity(insight);
    }

    @Transactional
    public InsightResponse createInsight(InsightRequest request) {
        CoachInsight insight = new CoachInsight();
        insight.setContent(request.getContent());
        insight.setPinned(request.isPinned());
        CoachInsight saved = insightRepository.save(insight);
        return InsightResponse.fromEntity(saved);
    }

    @Transactional
    public InsightResponse updateInsight(UUID id, InsightRequest request) {
        CoachInsight insight = insightRepository.findById(id)
            .orElseThrow(() -> new InsightNotFoundException(id));
        insight.setContent(request.getContent());
        insight.setPinned(request.isPinned());
        CoachInsight saved = insightRepository.save(insight);
        return InsightResponse.fromEntity(saved);
    }

    @Transactional
    public void deleteInsight(UUID id) {
        if (!insightRepository.existsById(id)) {
            throw new InsightNotFoundException(id);
        }
        insightRepository.deleteById(id);
    }

    public static class InsightNotFoundException extends RuntimeException {
        public InsightNotFoundException(UUID id) {
            super("Insight not found: " + id);
        }
    }
}
