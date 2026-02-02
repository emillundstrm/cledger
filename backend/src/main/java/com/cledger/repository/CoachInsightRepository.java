package com.cledger.repository;

import com.cledger.entity.CoachInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CoachInsightRepository extends JpaRepository<CoachInsight, UUID> {

    List<CoachInsight> findAllByOrderByPinnedDescUpdatedAtDesc();
}
