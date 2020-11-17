#!/usr/bin/env python3

import sys
import os
import datetime

args=sys.argv
#
#
#
date=datetime.datetime.now().strftime("%Y%m%d_%H%M%S_%f")

# -tzip : ???

cmd=f"c:/bin/7za.exe a -tzip extension_{date}.xpi ./__build/*"

try:
	os.system(cmd)
except KeyboardInterrupt:
	pass
