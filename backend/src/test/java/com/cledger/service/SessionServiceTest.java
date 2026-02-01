package com.cledger.service;

import com.cledger.dto.SessionRequest;
import com.cledger.dto.SessionResponse;
import com.cledger.entity.Session;
import com.cledger.entity.SessionInjury;
import com.cledger.repository.SessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessionServiceTest {

    @Mock
    private SessionRepository sessionRepository;

    @InjectMocks
    private SessionService sessionService;

    private SessionRequest validRequest;
    private Session sampleSession;

    @BeforeEach
    void setUp() {
        validRequest = new SessionRequest();
        validRequest.setDate(LocalDate.of(2026, 1, 15));
        validRequest.setTypes(Set.of("boulder", "hangboard"));
        validRequest.setIntensity("hard");
        validRequest.setPerformance("strong");
        validRequest.setProductivity("high");
        validRequest.setDurationMinutes(90);
        validRequest.setNotes("Good session");
        validRequest.setMaxGrade("7A");
        validRequest.setHardAttempts(5);
        validRequest.setInjuries(List.of(
            new SessionRequest.InjuryRequest("finger", "A2 pulley tweak")
        ));

        sampleSession = new Session();
        sampleSession.setId(UUID.randomUUID());
        sampleSession.setDate(LocalDate.of(2026, 1, 15));
        sampleSession.setTypes(Set.of("boulder", "hangboard"));
        sampleSession.setIntensity("hard");
        sampleSession.setPerformance("strong");
        sampleSession.setProductivity("high");
        sampleSession.setDurationMinutes(90);
        sampleSession.setNotes("Good session");
        sampleSession.setMaxGrade("7A");
        sampleSession.setHardAttempts(5);
        SessionInjury injury = new SessionInjury("finger", "A2 pulley tweak");
        injury.setSession(sampleSession);
        sampleSession.getInjuries().add(injury);
    }

    @Test
    void getAllSessions_returnsSortedByDateDesc() {
        when(sessionRepository.findAll(any(Sort.class))).thenReturn(List.of(sampleSession));

        List<SessionResponse> results = sessionService.getAllSessions();

        assertEquals(1, results.size());
        assertEquals(sampleSession.getId(), results.get(0).getId());
        verify(sessionRepository).findAll(Sort.by(Sort.Direction.DESC, "date"));
    }

    @Test
    void getSession_returnsSessionWhenFound() {
        UUID id = sampleSession.getId();
        when(sessionRepository.findById(id)).thenReturn(Optional.of(sampleSession));

        SessionResponse result = sessionService.getSession(id);

        assertEquals(id, result.getId());
        assertEquals("hard", result.getIntensity());
    }

    @Test
    void getSession_throwsWhenNotFound() {
        UUID id = UUID.randomUUID();
        when(sessionRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(SessionService.SessionNotFoundException.class,
            () -> sessionService.getSession(id));
    }

    @Test
    void createSession_savesAndReturnsSession() {
        when(sessionRepository.save(any(Session.class))).thenReturn(sampleSession);

        SessionResponse result = sessionService.createSession(validRequest);

        assertNotNull(result);
        assertEquals("hard", result.getIntensity());
        assertEquals(Set.of("boulder", "hangboard"), result.getTypes());
        verify(sessionRepository).save(any(Session.class));
    }

    @Test
    void createSession_rejectsInvalidType() {
        validRequest.setTypes(Set.of("swimming"));

        assertThrows(SessionService.InvalidSessionException.class,
            () -> sessionService.createSession(validRequest));
    }

    @Test
    void createSession_rejectsInvalidIntensity() {
        validRequest.setIntensity("extreme");

        assertThrows(SessionService.InvalidSessionException.class,
            () -> sessionService.createSession(validRequest));
    }

    @Test
    void createSession_rejectsInvalidPerformance() {
        validRequest.setPerformance("amazing");

        assertThrows(SessionService.InvalidSessionException.class,
            () -> sessionService.createSession(validRequest));
    }

    @Test
    void createSession_rejectsInvalidProductivity() {
        validRequest.setProductivity("extreme");

        assertThrows(SessionService.InvalidSessionException.class,
            () -> sessionService.createSession(validRequest));
    }

    @Test
    void createSession_rejectsBlankInjuryLocation() {
        validRequest.setInjuries(List.of(
            new SessionRequest.InjuryRequest("", null)
        ));

        assertThrows(SessionService.InvalidSessionException.class,
            () -> sessionService.createSession(validRequest));
    }

    @Test
    void updateSession_updatesExistingSession() {
        UUID id = sampleSession.getId();
        when(sessionRepository.findById(id)).thenReturn(Optional.of(sampleSession));
        when(sessionRepository.save(any(Session.class))).thenReturn(sampleSession);

        SessionResponse result = sessionService.updateSession(id, validRequest);

        assertNotNull(result);
        verify(sessionRepository).findById(id);
        verify(sessionRepository).save(any(Session.class));
    }

    @Test
    void updateSession_throwsWhenNotFound() {
        UUID id = UUID.randomUUID();
        when(sessionRepository.findById(id)).thenReturn(Optional.empty());

        assertThrows(SessionService.SessionNotFoundException.class,
            () -> sessionService.updateSession(id, validRequest));
    }

    @Test
    void deleteSession_deletesExistingSession() {
        UUID id = UUID.randomUUID();
        when(sessionRepository.existsById(id)).thenReturn(true);

        sessionService.deleteSession(id);

        verify(sessionRepository).deleteById(id);
    }

    @Test
    void deleteSession_throwsWhenNotFound() {
        UUID id = UUID.randomUUID();
        when(sessionRepository.existsById(id)).thenReturn(false);

        assertThrows(SessionService.SessionNotFoundException.class,
            () -> sessionService.deleteSession(id));
    }

    @Test
    void createSession_persistsVenueField() {
        validRequest.setVenue("Beta Bloc");
        sampleSession.setVenue("Beta Bloc");
        when(sessionRepository.save(any(Session.class))).thenReturn(sampleSession);

        SessionResponse result = sessionService.createSession(validRequest);

        assertNotNull(result);
        assertEquals("Beta Bloc", result.getVenue());
    }

    @Test
    void createSession_acceptsNullVenue() {
        validRequest.setVenue(null);
        when(sessionRepository.save(any(Session.class))).thenReturn(sampleSession);

        SessionResponse result = sessionService.createSession(validRequest);

        assertNotNull(result);
    }

    @Test
    void createSession_acceptsNullInjuries() {
        validRequest.setInjuries(null);
        when(sessionRepository.save(any(Session.class))).thenReturn(sampleSession);

        SessionResponse result = sessionService.createSession(validRequest);

        assertNotNull(result);
    }

    @Test
    void createSession_persistsInjuriesWithNotes() {
        validRequest.setInjuries(List.of(
            new SessionRequest.InjuryRequest("finger", "A2 pulley"),
            new SessionRequest.InjuryRequest("elbow", null)
        ));
        // Create a session with two injuries to return
        Session sessionWithInjuries = new Session();
        sessionWithInjuries.setId(UUID.randomUUID());
        sessionWithInjuries.setDate(validRequest.getDate());
        sessionWithInjuries.setTypes(validRequest.getTypes());
        sessionWithInjuries.setIntensity(validRequest.getIntensity());
        sessionWithInjuries.setPerformance(validRequest.getPerformance());
        sessionWithInjuries.setProductivity(validRequest.getProductivity());
        SessionInjury i1 = new SessionInjury("finger", "A2 pulley");
        i1.setSession(sessionWithInjuries);
        SessionInjury i2 = new SessionInjury("elbow", null);
        i2.setSession(sessionWithInjuries);
        sessionWithInjuries.getInjuries().add(i1);
        sessionWithInjuries.getInjuries().add(i2);
        when(sessionRepository.save(any(Session.class))).thenReturn(sessionWithInjuries);

        SessionResponse result = sessionService.createSession(validRequest);

        assertNotNull(result);
        assertEquals(2, result.getInjuries().size());
        assertEquals("finger", result.getInjuries().get(0).getLocation());
        assertEquals("A2 pulley", result.getInjuries().get(0).getNote());
        assertEquals("elbow", result.getInjuries().get(1).getLocation());
        assertNull(result.getInjuries().get(1).getNote());
    }

    @Test
    void createSession_acceptsFreeFormInjuryLocations() {
        validRequest.setInjuries(List.of(
            new SessionRequest.InjuryRequest("left knee", "Minor twinge"),
            new SessionRequest.InjuryRequest("lower back", null)
        ));
        when(sessionRepository.save(any(Session.class))).thenReturn(sampleSession);

        SessionResponse result = sessionService.createSession(validRequest);

        assertNotNull(result);
    }
}
