#!/bin/bash
# Simulated network gear for the ptt-monkat demo.
#
# net-snmp "pass" protocol: invoked as `script -g OID` (GET) or `-n OID`
# (GETNEXT). Answer with three lines — OID, type, value — or print nothing
# for "no such object". See snmpd.conf(5).
#
# Values random-walk inside a plausible band, with the previous value kept in
# /tmp so successive polls draw a continuous line instead of white noise.
# SNMP only carries integers here; the multiplier column in snmp_targets does
# the scaling (280 -> 41.2 C, -325 -> -3.25 dBm).

BASE=.1.3.6.1.4.1.99999

# oid_suffix  type     min   max  step  start
SPECS=(
  "1.1 gauge     5    95    6   40"   # router CPU %
  "2.1 gauge   280   520    8  410"   # router temperature, tenths of C
  "3.1 integer -800 -150   15 -325"   # DWDM RxPower, hundredths of dBm
  "4.1 gauge    60   100    2   92"   # UPS battery %
)

spec_for() {
  local want="$1"
  for spec in "${SPECS[@]}"; do
    set -- $spec
    [ "$1" = "$want" ] && { echo "$spec"; return 0; }
  done
  return 1
}

# walk emits one value for the given suffix, or nothing if it is unknown.
emit() {
  local suffix="$1" spec
  spec=$(spec_for "$suffix") || return 1
  set -- $spec
  local type="$2" min="$3" max="$4" step="$5" start="$6"

  local state="/tmp/ptt-sim.${suffix}"
  local prev
  prev=$(cat "$state" 2>/dev/null) || prev=""
  [ -z "$prev" ] && prev="$start"

  # Seed from bash's $RANDOM, not srand(): four OIDs polled inside the same
  # second would otherwise every one of them get an identical delta.
  local next
  next=$(awk -v p="$prev" -v lo="$min" -v hi="$max" -v st="$step" -v seed="$RANDOM" '
    BEGIN {
      srand(seed)
      v = p + int(rand() * (2 * st + 1)) - st
      if (v < lo) v = lo
      if (v > hi) v = hi
      print v
    }')

  echo "$next" > "$state"

  echo "${BASE}.${suffix}"
  echo "$type"
  echo "$next"
  return 0
}

case "$1" in
  -g)
    emit "${2#${BASE}.}"
    ;;
  -n)
    # GETNEXT: find the first suffix ordered after the requested OID.
    # Only snmpwalk uses this; the poller issues plain GETs.
    asked="${2#${BASE}}"
    asked="${asked#.}"
    for spec in "${SPECS[@]}"; do
      set -- $spec
      if [ -z "$asked" ] || [ "$(printf '%s\n%s\n' "$asked" "$1" | sort -V | head -1)" = "$asked" ] && [ "$asked" != "$1" ]; then
        emit "$1"
        exit 0
      fi
    done
    ;;
  -s|-S)
    # Read-only agent.
    echo "not-writable"
    ;;
esac

exit 0
