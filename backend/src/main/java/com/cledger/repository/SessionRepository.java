package com.cledger.repository;

import com.cledger.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {

    @Query("SELECT COUNT(s) FROM Session s WHERE s.date >= :startDate AND s.date <= :endDate")
    long countByDateBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COUNT(s) FROM Session s WHERE s.intensity = :intensity AND s.date >= :startDate AND s.date <= :endDate")
    long countByIntensityAndDateBetween(
        @Param("intensity") String intensity,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    @Query("SELECT DISTINCT s.date FROM Session s WHERE s.date >= :startDate AND s.date <= :endDate ORDER BY s.date DESC")
    List<LocalDate> findDistinctDatesByDateBetween(
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );

    @Query("SELECT s FROM Session s WHERE s.date >= :startDate AND s.date <= :endDate")
    List<Session> findByDateBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT i.location, COUNT(DISTINCT s) FROM Session s JOIN s.injuries i WHERE s.date >= :startDate AND s.date <= :endDate GROUP BY i.location")
    List<Object[]> countInjuryLocationsByDateBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT DISTINCT s.venue FROM Session s WHERE s.venue IS NOT NULL ORDER BY s.venue")
    List<String> findDistinctVenues();

    @Query("SELECT DISTINCT i.location FROM SessionInjury i ORDER BY i.location")
    List<String> findDistinctInjuryLocations();
}
