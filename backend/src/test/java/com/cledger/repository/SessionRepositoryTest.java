package com.cledger.repository;

import com.cledger.entity.Session;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class SessionRepositoryTest {

    @Autowired
    private SessionRepository sessionRepository;

    @Test
    void shouldSaveAndRetrieveSession() {
        Session session = new Session();
        session.setDate(LocalDate.of(2026, 1, 15));
        session.setIntensity("hard");
        session.setPerformance("strong");
        session.setProductivity("high");
        session.setDurationMinutes(90);
        session.setNotes("Great session");
        session.setMaxGrade("7A");
        session.setHardAttempts(5);
        session.setTypes(Set.of("boulder", "hangboard"));
        session.setPainFlags(Set.of("finger"));

        Session saved = sessionRepository.save(session);
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();

        Optional<Session> found = sessionRepository.findById(saved.getId());
        assertThat(found).isPresent();

        Session retrieved = found.get();
        assertThat(retrieved.getDate()).isEqualTo(LocalDate.of(2026, 1, 15));
        assertThat(retrieved.getIntensity()).isEqualTo("hard");
        assertThat(retrieved.getPerformance()).isEqualTo("strong");
        assertThat(retrieved.getProductivity()).isEqualTo("high");
        assertThat(retrieved.getDurationMinutes()).isEqualTo(90);
        assertThat(retrieved.getNotes()).isEqualTo("Great session");
        assertThat(retrieved.getMaxGrade()).isEqualTo("7A");
        assertThat(retrieved.getHardAttempts()).isEqualTo(5);
        assertThat(retrieved.getTypes()).containsExactlyInAnyOrder("boulder", "hangboard");
        assertThat(retrieved.getPainFlags()).containsExactly("finger");
    }

    @Test
    void shouldSaveSessionWithMinimalFields() {
        Session session = new Session();
        session.setDate(LocalDate.of(2026, 1, 20));
        session.setIntensity("easy");
        session.setPerformance("normal");
        session.setProductivity("normal");
        session.setTypes(Set.of("routes"));
        session.setPainFlags(Set.of());

        Session saved = sessionRepository.save(session);

        Optional<Session> found = sessionRepository.findById(saved.getId());
        assertThat(found).isPresent();

        Session retrieved = found.get();
        assertThat(retrieved.getDurationMinutes()).isNull();
        assertThat(retrieved.getNotes()).isNull();
        assertThat(retrieved.getMaxGrade()).isNull();
        assertThat(retrieved.getHardAttempts()).isNull();
        assertThat(retrieved.getTypes()).containsExactly("routes");
        assertThat(retrieved.getPainFlags()).isEmpty();
    }

    @Test
    void shouldDeleteSession() {
        Session session = new Session();
        session.setDate(LocalDate.of(2026, 1, 25));
        session.setIntensity("moderate");
        session.setPerformance("weak");
        session.setProductivity("low");
        session.setTypes(Set.of("strength"));
        session.setPainFlags(Set.of("elbow", "shoulder"));

        Session saved = sessionRepository.save(session);
        assertThat(sessionRepository.findById(saved.getId())).isPresent();

        sessionRepository.deleteById(saved.getId());
        assertThat(sessionRepository.findById(saved.getId())).isEmpty();
    }
}
