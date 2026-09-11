package service

import (
	"context"
	"errors"
	"time"

	"github.com/ujangdoubleday/ptt-monkat/apps/backend/internal/models"
	"github.com/ujangdoubleday/ptt-monkat/apps/backend/internal/repository"
)

type MetricService struct {
	targets *repository.TargetRepository
	metrics *repository.MetricRepository
}

func NewMetricService(targets *repository.TargetRepository, metrics *repository.MetricRepository) *MetricService {
	return &MetricService{targets: targets, metrics: metrics}
}

// Latest pairs every active target with its newest reading.
//
// An Influx failure fails the call rather than returning every device as
// unpolled — a dashboard full of nulls is indistinguishable from a dead network.
func (s *MetricService) Latest(ctx context.Context) ([]models.LatestMetric, error) {
	targets, err := s.targets.FindActive(ctx)
	if err != nil {
		return nil, err
	}

	points, err := s.metrics.LatestAll(ctx)
	if err != nil {
		return nil, err
	}

	return joinLatest(targets, points), nil
}

// History returns one target's readings for a named range. rangeKey is the
// raw query parameter; anything not in the table below is rejected rather
// than passed downstream.
func (s *MetricService) History(ctx context.Context, targetID uint64, rangeKey string) ([]models.MetricSample, error) {
	rng, window, ok := parseRange(rangeKey)
	if !ok {
		return nil, ErrUnknownRange
	}
	return s.metrics.History(ctx, targetID, rng, window)
}

// ErrUnknownRange is a bad request, not a datastore failure — the handler
// turns it into a 400 rather than a 502.
var ErrUnknownRange = errors.New("unknown range")

// ranges pairs each selectable range with a bucket width that keeps the
// response near 100 points. Never built from request input.
var ranges = map[string]struct{ rng, window time.Duration }{
	"15m": {15 * time.Minute, 10 * time.Second},
	"1h":  {time.Hour, time.Minute},
	"6h":  {6 * time.Hour, 5 * time.Minute},
	"24h": {24 * time.Hour, 15 * time.Minute},
}

// RangeKeys are the valid values, in display order.
var RangeKeys = []string{"15m", "1h", "6h", "24h"}

func parseRange(key string) (rng, window time.Duration, ok bool) {
	if key == "" {
		key = "1h"
	}
	r, found := ranges[key]
	return r.rng, r.window, found
}

// joinLatest is kept free of DB handles so it is testable without mocks.
// MariaDB drives the result: a point with no matching active target is dropped
// (decommissioned device), a target with no point keeps nil value/timestamp.
func joinLatest(targets []models.SnmpTarget, points map[uint64]models.MetricPoint) []models.LatestMetric {
	out := make([]models.LatestMetric, 0, len(targets))

	for _, t := range targets {
		row := models.LatestMetric{
			TargetID:   t.ID,
			DeviceName: t.DeviceName,
			IPAddress:  t.IPAddress,
			OID:        t.OID,
			MetricName: t.MetricName,
			Unit:       t.Unit,
			Category:   t.Category,
		}

		if p, ok := points[t.ID]; ok {
			value, ts := p.Value, p.Time
			row.Value = &value
			row.Timestamp = &ts
		}

		out = append(out, row)
	}

	return out
}
