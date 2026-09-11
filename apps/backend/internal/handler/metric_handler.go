package handler

import (
	"errors"
	"log"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/ujangdoubleday/ptt-monkat/apps/backend/internal/service"
)

type MetricHandler struct {
	svc *service.MetricService
}

func NewMetricHandler(svc *service.MetricService) *MetricHandler {
	return &MetricHandler{svc: svc}
}

// GetLatest handles GET /api/metrics/latest.
func (h *MetricHandler) GetLatest(c *fiber.Ctx) error {
	data, err := h.svc.Latest(c.UserContext())
	if err != nil {
		// Detail goes to the log; the client gets a generic message so DSNs
		// and bucket names never leak out of the trust boundary.
		log.Printf("metrics/latest: %v", err)
		return fiber.NewError(fiber.StatusBadGateway, "datastore unavailable")
	}
	return c.JSON(data)
}

// GetHistory handles GET /api/metrics/history?target_id=..&range=..
func (h *MetricHandler) GetHistory(c *fiber.Ctx) error {
	targetID, err := strconv.ParseUint(c.Query("target_id"), 10, 64)
	if err != nil {
		// Bad input is the caller's problem — say so, and say which parameter.
		return fiber.NewError(fiber.StatusBadRequest, "target_id must be a positive integer")
	}

	data, err := h.svc.History(c.UserContext(), targetID, c.Query("range"))
	if errors.Is(err, service.ErrUnknownRange) {
		return fiber.NewError(
			fiber.StatusBadRequest,
			"range must be one of "+strings.Join(service.RangeKeys, ", "),
		)
	}
	if err != nil {
		log.Printf("metrics/history: %v", err)
		return fiber.NewError(fiber.StatusBadGateway, "datastore unavailable")
	}

	return c.JSON(data)
}
