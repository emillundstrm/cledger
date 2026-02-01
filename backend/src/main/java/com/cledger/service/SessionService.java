package com.cledger.service;

import com.cledger.dto.SessionRequest;
import com.cledger.dto.SessionResponse;
import com.cledger.entity.Session;
import com.cledger.entity.SessionInjury;
import com.cledger.repository.SessionRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class SessionService {

    private static final Set<String> VALID_TYPES = Set.of(
        "boulder", "routes", "board", "hangboard", "strength", "prehab"
    );

    private static final Set<String> VALID_INTENSITIES = Set.of(
        "easy", "moderate", "hard"
    );

    private static final Set<String> VALID_PERFORMANCES = Set.of(
        "weak", "normal", "strong"
    );

    private static final Set<String> VALID_PRODUCTIVITIES = Set.of(
        "low", "normal", "high"
    );

    private final SessionRepository sessionRepository;

    public SessionService(SessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> getAllSessions() {
        return sessionRepository.findAll(Sort.by(Sort.Direction.DESC, "date"))
            .stream()
            .map(SessionResponse::fromEntity)
            .toList();
    }

    @Transactional(readOnly = true)
    public SessionResponse getSession(UUID id) {
        Session session = sessionRepository.findById(id)
            .orElseThrow(() -> new SessionNotFoundException(id));
        return SessionResponse.fromEntity(session);
    }

    @Transactional
    public SessionResponse createSession(SessionRequest request) {
        validateRequest(request);
        Session session = new Session();
        applyRequestToEntity(request, session);
        Session saved = sessionRepository.save(session);
        return SessionResponse.fromEntity(saved);
    }

    @Transactional
    public SessionResponse updateSession(UUID id, SessionRequest request) {
        validateRequest(request);
        Session session = sessionRepository.findById(id)
            .orElseThrow(() -> new SessionNotFoundException(id));
        applyRequestToEntity(request, session);
        Session saved = sessionRepository.save(session);
        return SessionResponse.fromEntity(saved);
    }

    @Transactional
    public void deleteSession(UUID id) {
        if (!sessionRepository.existsById(id)) {
            throw new SessionNotFoundException(id);
        }
        sessionRepository.deleteById(id);
    }

    private void applyRequestToEntity(SessionRequest request, Session session) {
        session.setDate(request.getDate());
        session.setTypes(request.getTypes());
        session.setIntensity(request.getIntensity());
        session.setPerformance(request.getPerformance());
        session.setProductivity(request.getProductivity());
        session.setDurationMinutes(request.getDurationMinutes());
        session.setNotes(request.getNotes());
        session.setMaxGrade(request.getMaxGrade());
        session.setHardAttempts(request.getHardAttempts());
        session.setVenue(request.getVenue());

        session.getInjuries().clear();
        List<SessionRequest.InjuryRequest> injuryRequests = request.getInjuries();
        if (injuryRequests != null) {
            for (SessionRequest.InjuryRequest ir : injuryRequests) {
                SessionInjury injury = new SessionInjury(ir.getLocation(), ir.getNote());
                injury.setSession(session);
                session.getInjuries().add(injury);
            }
        }
    }

    private void validateRequest(SessionRequest request) {
        for (String type : request.getTypes()) {
            if (!VALID_TYPES.contains(type)) {
                throw new InvalidSessionException("Invalid session type: " + type
                    + ". Valid types: " + VALID_TYPES);
            }
        }

        if (!VALID_INTENSITIES.contains(request.getIntensity())) {
            throw new InvalidSessionException("Invalid intensity: " + request.getIntensity()
                + ". Valid values: " + VALID_INTENSITIES);
        }

        if (!VALID_PERFORMANCES.contains(request.getPerformance())) {
            throw new InvalidSessionException("Invalid performance: " + request.getPerformance()
                + ". Valid values: " + VALID_PERFORMANCES);
        }

        if (!VALID_PRODUCTIVITIES.contains(request.getProductivity())) {
            throw new InvalidSessionException("Invalid productivity: " + request.getProductivity()
                + ". Valid values: " + VALID_PRODUCTIVITIES);
        }

        if (request.getInjuries() != null) {
            for (SessionRequest.InjuryRequest ir : request.getInjuries()) {
                if (ir.getLocation() == null || ir.getLocation().isBlank()) {
                    throw new InvalidSessionException("Injury location must not be blank");
                }
            }
        }
    }

    public static class SessionNotFoundException extends RuntimeException {
        public SessionNotFoundException(UUID id) {
            super("Session not found: " + id);
        }
    }

    public static class InvalidSessionException extends RuntimeException {
        public InvalidSessionException(String message) {
            super(message);
        }
    }
}
