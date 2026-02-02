package com.cledger.service;

import com.cledger.dto.InsightRequest;
import com.cledger.dto.InsightResponse;
import com.cledger.entity.CoachInsight;
import com.cledger.repository.CoachInsightRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InsightServiceTest {

    @Mock
    private CoachInsightRepository insightRepository;

    @InjectMocks
    private InsightService insightService;

    private CoachInsight sampleInsight;

    @BeforeEach
    void setUp() {
        sampleInsight = new CoachInsight();
        sampleInsight.setId(UUID.randomUUID());
        sampleInsight.setContent("Take a rest day after 3 consecutive hard sessions.");
        sampleInsight.setPinned(false);
        // Simulate @PrePersist
        try {
            var method = CoachInsight.class.getDeclaredMethod("onCreate");
            method.setAccessible(true);
            method.invoke(sampleInsight);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void getAllInsights_returnsOrderedList() {
        CoachInsight pinnedInsight = new CoachInsight();
        pinnedInsight.setId(UUID.randomUUID());
        pinnedInsight.setContent("Important: increase hangboard volume gradually.");
        pinnedInsight.setPinned(true);
        try {
            var method = CoachInsight.class.getDeclaredMethod("onCreate");
            method.setAccessible(true);
            method.invoke(pinnedInsight);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        when(insightRepository.findAllByOrderByPinnedDescUpdatedAtDesc())
            .thenReturn(List.of(pinnedInsight, sampleInsight));

        List<InsightResponse> results = insightService.getAllInsights();

        assertThat(results).hasSize(2);
        assertThat(results.get(0).isPinned()).isTrue();
        assertThat(results.get(1).isPinned()).isFalse();
    }

    @Test
    void getInsight_returnsInsight() {
        when(insightRepository.findById(sampleInsight.getId()))
            .thenReturn(Optional.of(sampleInsight));

        InsightResponse response = insightService.getInsight(sampleInsight.getId());

        assertThat(response.getContent()).isEqualTo(sampleInsight.getContent());
        assertThat(response.getId()).isEqualTo(sampleInsight.getId());
    }

    @Test
    void getInsight_throwsWhenNotFound() {
        UUID missingId = UUID.randomUUID();
        when(insightRepository.findById(missingId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> insightService.getInsight(missingId))
            .isInstanceOf(InsightService.InsightNotFoundException.class);
    }

    @Test
    void createInsight_savesAndReturns() {
        InsightRequest request = new InsightRequest();
        request.setContent("Focus on finger strength this cycle.");
        request.setPinned(true);

        when(insightRepository.save(any(CoachInsight.class))).thenAnswer(invocation -> {
            CoachInsight saved = invocation.getArgument(0);
            saved.setId(UUID.randomUUID());
            try {
                var method = CoachInsight.class.getDeclaredMethod("onCreate");
                method.setAccessible(true);
                method.invoke(saved);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
            return saved;
        });

        InsightResponse response = insightService.createInsight(request);

        assertThat(response.getContent()).isEqualTo("Focus on finger strength this cycle.");
        assertThat(response.isPinned()).isTrue();
        assertThat(response.getId()).isNotNull();
    }

    @Test
    void updateInsight_updatesAndReturns() {
        when(insightRepository.findById(sampleInsight.getId()))
            .thenReturn(Optional.of(sampleInsight));
        when(insightRepository.save(any(CoachInsight.class))).thenAnswer(invocation -> invocation.getArgument(0));

        InsightRequest request = new InsightRequest();
        request.setContent("Updated: take TWO rest days after hard blocks.");
        request.setPinned(true);

        InsightResponse response = insightService.updateInsight(sampleInsight.getId(), request);

        assertThat(response.getContent()).isEqualTo("Updated: take TWO rest days after hard blocks.");
        assertThat(response.isPinned()).isTrue();
    }

    @Test
    void updateInsight_throwsWhenNotFound() {
        UUID missingId = UUID.randomUUID();
        when(insightRepository.findById(missingId)).thenReturn(Optional.empty());

        InsightRequest request = new InsightRequest();
        request.setContent("something");

        assertThatThrownBy(() -> insightService.updateInsight(missingId, request))
            .isInstanceOf(InsightService.InsightNotFoundException.class);
    }

    @Test
    void deleteInsight_deletesWhenExists() {
        when(insightRepository.existsById(sampleInsight.getId())).thenReturn(true);

        insightService.deleteInsight(sampleInsight.getId());

        verify(insightRepository).deleteById(sampleInsight.getId());
    }

    @Test
    void deleteInsight_throwsWhenNotFound() {
        UUID missingId = UUID.randomUUID();
        when(insightRepository.existsById(missingId)).thenReturn(false);

        assertThatThrownBy(() -> insightService.deleteInsight(missingId))
            .isInstanceOf(InsightService.InsightNotFoundException.class);
    }
}
