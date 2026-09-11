#!/bin/bash
# Simulated DC power plants for 87 telecom sites.
#
# net-snmp "pass_persist": ONE long-lived process, driven line-by-line on
# stdin. `pass` forks per GET, and at ~340 targets every 10s that is 34 forks
# a second through a single-threaded snmpd — it would not keep up.
#
#   PING             -> PONG
#   get \n <oid>     -> <oid> \n <type> \n <value>   (or NONE)
#   getnext \n <oid> -> the next oid we serve        (or NONE)
#   set \n <oid> ...  -> not-writable
#
# OIDs are .1.3.6.1.4.1.99999.10.<site>.<metric>, metric 1..5 =
# BVolt, BCap, Load, Temp, PLN. Values are integers; the multiplier column in
# snmp_targets scales them back (5200 -> 52.00 V).

BASE=.1.3.6.1.4.1.99999.10
SEED=/usr/local/share/ptt-site-seed.txt

declare -A VALUE       # "<site>.<metric>" -> current integer value
ORDER=()               # suffixes in numeric order, for getnext

while read -r suffix start; do
  [ -z "$suffix" ] && continue
  VALUE["$suffix"]=$start
  ORDER+=("$suffix")
done < "$SEED"

# Per-metric random walk. Steps are small enough that a site does not flip
# status every tick — an operator watching a wall display should see drift,
# not a strobe. Bounds are in the same integer units as the seed.
#
# A case, not an array of namerefs: this image ships bash 4.2 and `local -n`
# needs 4.3.
walk() {
  local suffix=$1
  local metric=${suffix#*.}
  local min max step

  case "$metric" in
    1) min=4800; max=5300; step=4  ;;  # BVolt, hundredths of a volt
    2) min=8000; max=10000; step=15 ;; # BCap, hundredths of a percent
    3) min=4;    max=1000; step=6  ;;  # Load, tenths of an amp
    4) min=100;  max=380;  step=2  ;;  # Temp, tenths of a degree
    5) min=185;  max=245;  step=2  ;;  # PLN, whole volts
    *) min=0;    max=100000; step=1 ;;
  esac

  local v=${VALUE[$suffix]}
  # $RANDOM is per-process and cheap; no awk, no subshell.
  v=$(( v + (RANDOM % (2 * step + 1)) - step ))
  (( v < min )) && v=$min
  (( v > max )) && v=$max
  VALUE[$suffix]=$v
  echo "$v"
}

emit() {
  local suffix=$1
  [ -z "${VALUE[$suffix]+x}" ] && { echo NONE; return; }
  echo "${BASE}.${suffix}"
  echo "integer"
  walk "$suffix"
}

# getnext walks ORDER, which is already in seed-file order (site then metric).
next_suffix() {
  local asked=$1 i
  for i in "${!ORDER[@]}"; do
    if [ "${ORDER[$i]}" = "$asked" ]; then
      echo "${ORDER[$((i + 1))]}"
      return
    fi
  done
  # Unknown or bare base: start at the beginning.
  echo "${ORDER[0]}"
}

while read -r cmd; do
  case "$cmd" in
    PING)
      echo PONG
      ;;
    get)
      read -r oid
      emit "${oid#${BASE}.}"
      ;;
    getnext)
      read -r oid
      suffix=$(next_suffix "${oid#${BASE}.}")
      if [ -z "$suffix" ]; then echo NONE; else emit "$suffix"; fi
      ;;
    set)
      read -r _oid
      read -r _val
      echo not-writable
      ;;
    *)
      # Unknown verb — stay quiet rather than desync the protocol.
      ;;
  esac
done
