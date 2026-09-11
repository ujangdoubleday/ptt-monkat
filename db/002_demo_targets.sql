-- Demo targets, pointed at the simulated agent in sim/ptt-sim.sh.
-- Kept out of 001 so the production schema carries no fake devices.
--
-- SNMP only carries integers, so the multiplier column does the scaling:
-- raw 412 x 0.1 -> 41.2 C, raw -325 x 0.01 -> -3.25 dBm. That is exactly the
-- job that column exists for.

USE ptt_monkat;

INSERT INTO snmp_targets
  (device_name, ip_address, oid, metric_name, unit, multiplier, snmp_port)
VALUES
  ('sim-rtr-jkt-01',  '127.0.0.1', '1.3.6.1.4.1.99999.1.1', 'CPU',     '%',   1.00, 1161),
  ('sim-rtr-jkt-01',  '127.0.0.1', '1.3.6.1.4.1.99999.2.1', 'Temp',    'C',   0.10, 1161),
  ('sim-dwdm-sby-01', '127.0.0.1', '1.3.6.1.4.1.99999.3.1', 'RxPower', 'dBm', 0.01, 1161),
  ('sim-ups-jkt-01',  '127.0.0.1', '1.3.6.1.4.1.99999.4.1', 'Battery', '%',   1.00, 1161)
ON DUPLICATE KEY UPDATE
  device_name = VALUES(device_name),
  metric_name = VALUES(metric_name),
  unit        = VALUES(unit),
  multiplier  = VALUES(multiplier),
  snmp_port   = VALUES(snmp_port);
