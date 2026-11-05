window.SCHED_SAMPLES = [
  {name:"fcfs_cs1",label:"FCFS Cs1",trace:{
  "version": "1.0",
  "algo": "fcfs",
  "quantum": null,
  "context_switch_cost": 1,
  "processes": [
    {
      "pid": 1,
      "arrival": 0,
      "burst": 3,
      "priority": 1,
      "start": 0,
      "completion": 3,
      "waiting": 0,
      "turnaround": 3,
      "response": 0
    },
    {
      "pid": 2,
      "arrival": 1,
      "burst": 2,
      "priority": 1,
      "start": 4,
      "completion": 6,
      "waiting": 3,
      "turnaround": 5,
      "response": 3
    },
    {
      "pid": 3,
      "arrival": 2,
      "burst": 1,
      "priority": 1,
      "start": 7,
      "completion": 8,
      "waiting": 5,
      "turnaround": 6,
      "response": 5
    }
  ],
  "timeline": [
    {
      "t_start": 0,
      "t_end": 3,
      "pid": 1,
      "type": "run"
    },
    {
      "t_start": 3,
      "t_end": 4,
      "pid": 2,
      "type": "context_switch"
    },
    {
      "t_start": 4,
      "t_end": 6,
      "pid": 2,
      "type": "run"
    },
    {
      "t_start": 6,
      "t_end": 7,
      "pid": 3,
      "type": "context_switch"
    },
    {
      "t_start": 7,
      "t_end": 8,
      "pid": 3,
      "type": "run"
    }
  ],
  "events": [
    {
      "t": 0,
      "type": "arrive",
      "pid": 1,
      "ready_queue": [
        0
      ]
    },
    {
      "t": 0,
      "type": "dispatch",
      "pid": 1,
      "ready_queue": []
    },
    {
      "t": 1,
      "type": "arrive",
      "pid": 2,
      "ready_queue": [
        1
      ]
    },
    {
      "t": 2,
      "type": "arrive",
      "pid": 3,
      "ready_queue": [
        1,
        2
      ]
    },
    {
      "t": 3,
      "type": "complete",
      "pid": 1,
      "ready_queue": [
        1,
        2
      ]
    },
    {
      "t": 4,
      "type": "dispatch",
      "pid": 2,
      "ready_queue": [
        2
      ]
    },
    {
      "t": 6,
      "type": "complete",
      "pid": 2,
      "ready_queue": [
        2
      ]
    },
    {
      "t": 7,
      "type": "dispatch",
      "pid": 3,
      "ready_queue": []
    },
    {
      "t": 8,
      "type": "complete",
      "pid": 3,
      "ready_queue": []
    }
  ],
  "metrics": {
    "avg_waiting": 2.67,
    "avg_turnaround": 4.67,
    "avg_response": 2.67,
    "cpu_utilization": 75,
    "throughput": 0.38,
    "context_switches": 2
  }
}},
  {name:"fcfs_textbook",label:"FCFS Textbook",trace:{
  "version": "1.0",
  "algo": "fcfs",
  "quantum": null,
  "context_switch_cost": 0,
  "processes": [
    {
      "pid": 1,
      "arrival": 0,
      "burst": 24,
      "priority": 3,
      "start": 0,
      "completion": 24,
      "waiting": 0,
      "turnaround": 24,
      "response": 0
    },
    {
      "pid": 2,
      "arrival": 0,
      "burst": 3,
      "priority": 1,
      "start": 24,
      "completion": 27,
      "waiting": 24,
      "turnaround": 27,
      "response": 24
    },
    {
      "pid": 3,
      "arrival": 0,
      "burst": 3,
      "priority": 2,
      "start": 27,
      "completion": 30,
      "waiting": 27,
      "turnaround": 30,
      "response": 27
    }
  ],
  "timeline": [
    {
      "t_start": 0,
      "t_end": 24,
      "pid": 1,
      "type": "run"
    },
    {
      "t_start": 24,
      "t_end": 27,
      "pid": 2,
      "type": "run"
    },
    {
      "t_start": 27,
      "t_end": 30,
      "pid": 3,
      "type": "run"
    }
  ],
  "events": [
    {
      "t": 0,
      "type": "arrive",
      "pid": 1,
      "ready_queue": [
        0
      ]
    },
    {
      "t": 0,
      "type": "arrive",
      "pid": 2,
      "ready_queue": [
        0,
        1
      ]
    },
    {
      "t": 0,
      "type": "arrive",
      "pid": 3,
      "ready_queue": [
        0,
        1,
        2
      ]
    },
    {
      "t": 0,
      "type": "dispatch",
      "pid": 1,
      "ready_queue": [
        1,
        2
      ]
    },
    {
      "t": 24,
      "type": "complete",
      "pid": 1,
      "ready_queue": [
        1,
        2
      ]
    },
    {
      "t": 24,
      "type": "dispatch",
      "pid": 2,
      "ready_queue": [
        2
      ]
    },
    {
      "t": 27,
      "type": "complete",
      "pid": 2,
      "ready_queue": [
        2
      ]
    },
    {
      "t": 27,
      "type": "dispatch",
      "pid": 3,
      "ready_queue": []
    },
    {
      "t": 30,
      "type": "complete",
      "pid": 3,
      "ready_queue": []
    }
  ],
  "metrics": {
    "avg_waiting": 17,
    "avg_turnaround": 27,
    "avg_response": 17,
    "cpu_utilization": 100,
    "throughput": 0.1,
    "context_switches": 2
  }
}},
  {name:"priority_idle",label:"Priority Idle",trace:{
  "version": "1.0",
  "algo": "priority",
  "quantum": null,
  "context_switch_cost": 0,
  "processes": [
    {
      "pid": 1,
      "arrival": 2,
      "burst": 3,
      "priority": 2,
      "start": 2,
      "completion": 5,
      "waiting": 0,
      "turnaround": 3,
      "response": 0
    },
    {
      "pid": 2,
      "arrival": 3,
      "burst": 2,
      "priority": 1,
      "start": 5,
      "completion": 7,
      "waiting": 2,
      "turnaround": 4,
      "response": 2
    },
    {
      "pid": 3,
      "arrival": 10,
      "burst": 1,
      "priority": 1,
      "start": 10,
      "completion": 11,
      "waiting": 0,
      "turnaround": 1,
      "response": 0
    }
  ],
  "timeline": [
    {
      "t_start": 0,
      "t_end": 2,
      "pid": null,
      "type": "idle"
    },
    {
      "t_start": 2,
      "t_end": 5,
      "pid": 1,
      "type": "run"
    },
    {
      "t_start": 5,
      "t_end": 7,
      "pid": 2,
      "type": "run"
    },
    {
      "t_start": 7,
      "t_end": 10,
      "pid": null,
      "type": "idle"
    },
    {
      "t_start": 10,
      "t_end": 11,
      "pid": 3,
      "type": "run"
    }
  ],
  "events": [
    {
      "t": 2,
      "type": "arrive",
      "pid": 1,
      "ready_queue": [
        0
      ]
    },
    {
      "t": 2,
      "type": "dispatch",
      "pid": 1,
      "ready_queue": []
    },
    {
      "t": 3,
      "type": "arrive",
      "pid": 2,
      "ready_queue": [
        1
      ]
    },
    {
      "t": 5,
      "type": "complete",
      "pid": 1,
      "ready_queue": [
        1
      ]
    },
    {
      "t": 5,
      "type": "dispatch",
      "pid": 2,
      "ready_queue": []
    },
    {
      "t": 7,
      "type": "complete",
      "pid": 2,
      "ready_queue": []
    },
    {
      "t": 10,
      "type": "arrive",
      "pid": 3,
      "ready_queue": [
        2
      ]
    },
    {
      "t": 10,
      "type": "dispatch",
      "pid": 3,
      "ready_queue": []
    },
    {
      "t": 11,
      "type": "complete",
      "pid": 3,
      "ready_queue": []
    }
  ],
  "metrics": {
    "avg_waiting": 0.67,
    "avg_turnaround": 2.67,
    "avg_response": 0.67,
    "cpu_utilization": 54.55,
    "throughput": 0.27,
    "context_switches": 2
  }
}},
  {name:"priority_p",label:"Priority P",trace:{
  "version": "1.0",
  "algo": "priority-p",
  "quantum": null,
  "context_switch_cost": 0,
  "processes": [
    {
      "pid": 1,
      "arrival": 0,
      "burst": 6,
      "priority": 3,
      "start": 0,
      "completion": 12,
      "waiting": 6,
      "turnaround": 12,
      "response": 0
    },
    {
      "pid": 2,
      "arrival": 1,
      "burst": 4,
      "priority": 1,
      "start": 1,
      "completion": 5,
      "waiting": 0,
      "turnaround": 4,
      "response": 0
    },
    {
      "pid": 3,
      "arrival": 2,
      "burst": 2,
      "priority": 2,
      "start": 5,
      "completion": 7,
      "waiting": 3,
      "turnaround": 5,
      "response": 3
    }
  ],
  "timeline": [
    {
      "t_start": 0,
      "t_end": 1,
      "pid": 1,
      "type": "run"
    },
    {
      "t_start": 1,
      "t_end": 5,
      "pid": 2,
      "type": "run"
    },
    {
      "t_start": 5,
      "t_end": 7,
      "pid": 3,
      "type": "run"
    },
    {
      "t_start": 7,
      "t_end": 12,
      "pid": 1,
      "type": "run"
    }
  ],
  "events": [
    {
      "t": 0,
      "type": "arrive",
      "pid": 1,
      "ready_queue": [
        0
      ]
    },
    {
      "t": 0,
      "type": "dispatch",
      "pid": 1,
      "ready_queue": []
    },
    {
      "t": 1,
      "type": "arrive",
      "pid": 2,
      "ready_queue": [
        1
      ]
    },
    {
      "t": 1,
      "type": "preempt",
      "pid": 1,
      "ready_queue": [
        1,
        0
      ]
    },
    {
      "t": 1,
      "type": "dispatch",
      "pid": 2,
      "ready_queue": [
        0
      ]
    },
    {
      "t": 2,
      "type": "arrive",
      "pid": 3,
      "ready_queue": [
        0,
        2
      ]
    },
    {
      "t": 5,
      "type": "complete",
      "pid": 2,
      "ready_queue": [
        0,
        2
      ]
    },
    {
      "t": 5,
      "type": "dispatch",
      "pid": 3,
      "ready_queue": [
        0
      ]
    },
    {
      "t": 7,
      "type": "complete",
      "pid": 3,
      "ready_queue": [
        0
      ]
    },
    {
      "t": 7,
      "type": "dispatch",
      "pid": 1,
      "ready_queue": []
    },
    {
      "t": 12,
      "type": "complete",
      "pid": 1,
      "ready_queue": []
    }
  ],
  "metrics": {
    "avg_waiting": 3,
    "avg_turnaround": 7,
    "avg_response": 1,
    "cpu_utilization": 100,
    "throughput": 0.25,
    "context_switches": 3
  }
}},
  {name:"rr_q2",label:"RR Q2",trace:{
  "version": "1.0",
  "algo": "rr",
  "quantum": 2,
  "context_switch_cost": 0,
  "processes": [
    {
      "pid": 1,
      "arrival": 0,
      "burst": 5,
      "priority": 1,
      "start": 0,
      "completion": 9,
      "waiting": 4,
      "turnaround": 9,
      "response": 0
    },
    {
      "pid": 2,
      "arrival": 1,
      "burst": 3,
      "priority": 1,
      "start": 2,
      "completion": 8,
      "waiting": 4,
      "turnaround": 7,
      "response": 1
    },
    {
      "pid": 3,
      "arrival": 2,
      "burst": 1,
      "priority": 1,
      "start": 4,
      "completion": 5,
      "waiting": 2,
      "turnaround": 3,
      "response": 2
    }
  ],
  "timeline": [
    {
      "t_start": 0,
      "t_end": 2,
      "pid": 1,
      "type": "run"
    },
    {
      "t_start": 2,
      "t_end": 4,
      "pid": 2,
      "type": "run"
    },
    {
      "t_start": 4,
      "t_end": 5,
      "pid": 3,
      "type": "run"
    },
    {
      "t_start": 5,
      "t_end": 7,
      "pid": 1,
      "type": "run"
    },
    {
      "t_start": 7,
      "t_end": 8,
      "pid": 2,
      "type": "run"
    },
    {
      "t_start": 8,
      "t_end": 9,
      "pid": 1,
      "type": "run"
    }
  ],
  "events": [
    {
      "t": 0,
      "type": "arrive",
      "pid": 1,
      "ready_queue": [
        0
      ]
    },
    {
      "t": 0,
      "type": "dispatch",
      "pid": 1,
      "ready_queue": []
    },
    {
      "t": 1,
      "type": "arrive",
      "pid": 2,
      "ready_queue": [
        1
      ]
    },
    {
      "t": 2,
      "type": "arrive",
      "pid": 3,
      "ready_queue": [
        1,
        2
      ]
    },
    {
      "t": 2,
      "type": "preempt",
      "pid": 1,
      "ready_queue": [
        1,
        2,
        0
      ]
    },
    {
      "t": 2,
      "type": "dispatch",
      "pid": 2,
      "ready_queue": [
        2,
        0
      ]
    },
    {
      "t": 4,
      "type": "preempt",
      "pid": 2,
      "ready_queue": [
        2,
        0,
        1
      ]
    },
    {
      "t": 4,
      "type": "dispatch",
      "pid": 3,
      "ready_queue": [
        0,
        1
      ]
    },
    {
      "t": 5,
      "type": "complete",
      "pid": 3,
      "ready_queue": [
        0,
        1
      ]
    },
    {
      "t": 5,
      "type": "dispatch",
      "pid": 1,
      "ready_queue": [
        1
      ]
    },
    {
      "t": 7,
      "type": "preempt",
      "pid": 1,
      "ready_queue": [
        1,
        0
      ]
    },
    {
      "t": 7,
      "type": "dispatch",
      "pid": 2,
      "ready_queue": [
        0
      ]
    },
    {
      "t": 8,
      "type": "complete",
      "pid": 2,
      "ready_queue": [
        0
      ]
    },
    {
      "t": 8,
      "type": "dispatch",
      "pid": 1,
      "ready_queue": []
    },
    {
      "t": 9,
      "type": "complete",
      "pid": 1,
      "ready_queue": []
    }
  ],
  "metrics": {
    "avg_waiting": 3.33,
    "avg_turnaround": 6.33,
    "avg_response": 1,
    "cpu_utilization": 100,
    "throughput": 0.33,
    "context_switches": 5
  }
}},
  {name:"sjf_basic",label:"SJF Basic",trace:{
  "version": "1.0",
  "algo": "sjf",
  "quantum": null,
  "context_switch_cost": 0,
  "processes": [
    {
      "pid": 1,
      "arrival": 0,
      "burst": 7,
      "priority": 1,
      "start": 0,
      "completion": 7,
      "waiting": 0,
      "turnaround": 7,
      "response": 0
    },
    {
      "pid": 2,
      "arrival": 2,
      "burst": 4,
      "priority": 1,
      "start": 8,
      "completion": 12,
      "waiting": 6,
      "turnaround": 10,
      "response": 6
    },
    {
      "pid": 3,
      "arrival": 4,
      "burst": 1,
      "priority": 1,
      "start": 7,
      "completion": 8,
      "waiting": 3,
      "turnaround": 4,
      "response": 3
    },
    {
      "pid": 4,
      "arrival": 5,
      "burst": 4,
      "priority": 1,
      "start": 12,
      "completion": 16,
      "waiting": 7,
      "turnaround": 11,
      "response": 7
    }
  ],
  "timeline": [
    {
      "t_start": 0,
      "t_end": 7,
      "pid": 1,
      "type": "run"
    },
    {
      "t_start": 7,
      "t_end": 8,
      "pid": 3,
      "type": "run"
    },
    {
      "t_start": 8,
      "t_end": 12,
      "pid": 2,
      "type": "run"
    },
    {
      "t_start": 12,
      "t_end": 16,
      "pid": 4,
      "type": "run"
    }
  ],
  "events": [
    {
      "t": 0,
      "type": "arrive",
      "pid": 1,
      "ready_queue": [
        0
      ]
    },
    {
      "t": 0,
      "type": "dispatch",
      "pid": 1,
      "ready_queue": []
    },
    {
      "t": 2,
      "type": "arrive",
      "pid": 2,
      "ready_queue": [
        1
      ]
    },
    {
      "t": 4,
      "type": "arrive",
      "pid": 3,
      "ready_queue": [
        1,
        2
      ]
    },
    {
      "t": 5,
      "type": "arrive",
      "pid": 4,
      "ready_queue": [
        1,
        2,
        3
      ]
    },
    {
      "t": 7,
      "type": "complete",
      "pid": 1,
      "ready_queue": [
        1,
        2,
        3
      ]
    },
    {
      "t": 7,
      "type": "dispatch",
      "pid": 3,
      "ready_queue": [
        1,
        3
      ]
    },
    {
      "t": 8,
      "type": "complete",
      "pid": 3,
      "ready_queue": [
        1,
        3
      ]
    },
    {
      "t": 8,
      "type": "dispatch",
      "pid": 2,
      "ready_queue": [
        3
      ]
    },
    {
      "t": 12,
      "type": "complete",
      "pid": 2,
      "ready_queue": [
        3
      ]
    },
    {
      "t": 12,
      "type": "dispatch",
      "pid": 4,
      "ready_queue": []
    },
    {
      "t": 16,
      "type": "complete",
      "pid": 4,
      "ready_queue": []
    }
  ],
  "metrics": {
    "avg_waiting": 4,
    "avg_turnaround": 8,
    "avg_response": 4,
    "cpu_utilization": 100,
    "throughput": 0.25,
    "context_switches": 3
  }
}},
  {name:"srtf_basic",label:"SRTF Basic",trace:{
  "version": "1.0",
  "algo": "srtf",
  "quantum": null,
  "context_switch_cost": 0,
  "processes": [
    {
      "pid": 1,
      "arrival": 0,
      "burst": 7,
      "priority": 1,
      "start": 0,
      "completion": 16,
      "waiting": 9,
      "turnaround": 16,
      "response": 0
    },
    {
      "pid": 2,
      "arrival": 2,
      "burst": 4,
      "priority": 1,
      "start": 2,
      "completion": 7,
      "waiting": 1,
      "turnaround": 5,
      "response": 0
    },
    {
      "pid": 3,
      "arrival": 4,
      "burst": 1,
      "priority": 1,
      "start": 4,
      "completion": 5,
      "waiting": 0,
      "turnaround": 1,
      "response": 0
    },
    {
      "pid": 4,
      "arrival": 5,
      "burst": 4,
      "priority": 1,
      "start": 7,
      "completion": 11,
      "waiting": 2,
      "turnaround": 6,
      "response": 2
    }
  ],
  "timeline": [
    {
      "t_start": 0,
      "t_end": 2,
      "pid": 1,
      "type": "run"
    },
    {
      "t_start": 2,
      "t_end": 4,
      "pid": 2,
      "type": "run"
    },
    {
      "t_start": 4,
      "t_end": 5,
      "pid": 3,
      "type": "run"
    },
    {
      "t_start": 5,
      "t_end": 7,
      "pid": 2,
      "type": "run"
    },
    {
      "t_start": 7,
      "t_end": 11,
      "pid": 4,
      "type": "run"
    },
    {
      "t_start": 11,
      "t_end": 16,
      "pid": 1,
      "type": "run"
    }
  ],
  "events": [
    {
      "t": 0,
      "type": "arrive",
      "pid": 1,
      "ready_queue": [
        0
      ]
    },
    {
      "t": 0,
      "type": "dispatch",
      "pid": 1,
      "ready_queue": []
    },
    {
      "t": 2,
      "type": "arrive",
      "pid": 2,
      "ready_queue": [
        1
      ]
    },
    {
      "t": 2,
      "type": "preempt",
      "pid": 1,
      "ready_queue": [
        1,
        0
      ]
    },
    {
      "t": 2,
      "type": "dispatch",
      "pid": 2,
      "ready_queue": [
        0
      ]
    },
    {
      "t": 4,
      "type": "arrive",
      "pid": 3,
      "ready_queue": [
        0,
        2
      ]
    },
    {
      "t": 4,
      "type": "preempt",
      "pid": 2,
      "ready_queue": [
        0,
        2,
        1
      ]
    },
    {
      "t": 4,
      "type": "dispatch",
      "pid": 3,
      "ready_queue": [
        0,
        1
      ]
    },
    {
      "t": 5,
      "type": "complete",
      "pid": 3,
      "ready_queue": [
        0,
        1
      ]
    },
    {
      "t": 5,
      "type": "arrive",
      "pid": 4,
      "ready_queue": [
        0,
        1,
        3
      ]
    },
    {
      "t": 5,
      "type": "dispatch",
      "pid": 2,
      "ready_queue": [
        0,
        3
      ]
    },
    {
      "t": 7,
      "type": "complete",
      "pid": 2,
      "ready_queue": [
        0,
        3
      ]
    },
    {
      "t": 7,
      "type": "dispatch",
      "pid": 4,
      "ready_queue": [
        0
      ]
    },
    {
      "t": 11,
      "type": "complete",
      "pid": 4,
      "ready_queue": [
        0
      ]
    },
    {
      "t": 11,
      "type": "dispatch",
      "pid": 1,
      "ready_queue": []
    },
    {
      "t": 16,
      "type": "complete",
      "pid": 1,
      "ready_queue": []
    }
  ],
  "metrics": {
    "avg_waiting": 3,
    "avg_turnaround": 7,
    "avg_response": 0.5,
    "cpu_utilization": 100,
    "throughput": 0.25,
    "context_switches": 5
  }
}},
  {name:"compare_all",label:"Compare All (SJF input)",trace:{
  "version": "1.0",
  "compare": true,
  "runs": [
    {
      "version": "1.0",
      "algo": "fcfs",
      "quantum": null,
      "context_switch_cost": 0,
      "processes": [
        {
          "pid": 1,
          "arrival": 0,
          "burst": 7,
          "priority": 1,
          "start": 0,
          "completion": 7,
          "waiting": 0,
          "turnaround": 7,
          "response": 0
        },
        {
          "pid": 2,
          "arrival": 2,
          "burst": 4,
          "priority": 1,
          "start": 7,
          "completion": 11,
          "waiting": 5,
          "turnaround": 9,
          "response": 5
        },
        {
          "pid": 3,
          "arrival": 4,
          "burst": 1,
          "priority": 1,
          "start": 11,
          "completion": 12,
          "waiting": 7,
          "turnaround": 8,
          "response": 7
        },
        {
          "pid": 4,
          "arrival": 5,
          "burst": 4,
          "priority": 1,
          "start": 12,
          "completion": 16,
          "waiting": 7,
          "turnaround": 11,
          "response": 7
        }
      ],
      "timeline": [
        {
          "t_start": 0,
          "t_end": 7,
          "pid": 1,
          "type": "run"
        },
        {
          "t_start": 7,
          "t_end": 11,
          "pid": 2,
          "type": "run"
        },
        {
          "t_start": 11,
          "t_end": 12,
          "pid": 3,
          "type": "run"
        },
        {
          "t_start": 12,
          "t_end": 16,
          "pid": 4,
          "type": "run"
        }
      ],
      "events": [
        {
          "t": 0,
          "type": "arrive",
          "pid": 1,
          "ready_queue": [
            0
          ]
        },
        {
          "t": 0,
          "type": "dispatch",
          "pid": 1,
          "ready_queue": []
        },
        {
          "t": 2,
          "type": "arrive",
          "pid": 2,
          "ready_queue": [
            1
          ]
        },
        {
          "t": 4,
          "type": "arrive",
          "pid": 3,
          "ready_queue": [
            1,
            2
          ]
        },
        {
          "t": 5,
          "type": "arrive",
          "pid": 4,
          "ready_queue": [
            1,
            2,
            3
          ]
        },
        {
          "t": 7,
          "type": "complete",
          "pid": 1,
          "ready_queue": [
            1,
            2,
            3
          ]
        },
        {
          "t": 7,
          "type": "dispatch",
          "pid": 2,
          "ready_queue": [
            2,
            3
          ]
        },
        {
          "t": 11,
          "type": "complete",
          "pid": 2,
          "ready_queue": [
            2,
            3
          ]
        },
        {
          "t": 11,
          "type": "dispatch",
          "pid": 3,
          "ready_queue": [
            3
          ]
        },
        {
          "t": 12,
          "type": "complete",
          "pid": 3,
          "ready_queue": [
            3
          ]
        },
        {
          "t": 12,
          "type": "dispatch",
          "pid": 4,
          "ready_queue": []
        },
        {
          "t": 16,
          "type": "complete",
          "pid": 4,
          "ready_queue": []
        }
      ],
      "metrics": {
        "avg_waiting": 4.75,
        "avg_turnaround": 8.75,
        "avg_response": 4.75,
        "cpu_utilization": 100,
        "throughput": 0.25,
        "context_switches": 3
      }
    },
    {
      "version": "1.0",
      "algo": "sjf",
      "quantum": null,
      "context_switch_cost": 0,
      "processes": [
        {
          "pid": 1,
          "arrival": 0,
          "burst": 7,
          "priority": 1,
          "start": 0,
          "completion": 7,
          "waiting": 0,
          "turnaround": 7,
          "response": 0
        },
        {
          "pid": 2,
          "arrival": 2,
          "burst": 4,
          "priority": 1,
          "start": 8,
          "completion": 12,
          "waiting": 6,
          "turnaround": 10,
          "response": 6
        },
        {
          "pid": 3,
          "arrival": 4,
          "burst": 1,
          "priority": 1,
          "start": 7,
          "completion": 8,
          "waiting": 3,
          "turnaround": 4,
          "response": 3
        },
        {
          "pid": 4,
          "arrival": 5,
          "burst": 4,
          "priority": 1,
          "start": 12,
          "completion": 16,
          "waiting": 7,
          "turnaround": 11,
          "response": 7
        }
      ],
      "timeline": [
        {
          "t_start": 0,
          "t_end": 7,
          "pid": 1,
          "type": "run"
        },
        {
          "t_start": 7,
          "t_end": 8,
          "pid": 3,
          "type": "run"
        },
        {
          "t_start": 8,
          "t_end": 12,
          "pid": 2,
          "type": "run"
        },
        {
          "t_start": 12,
          "t_end": 16,
          "pid": 4,
          "type": "run"
        }
      ],
      "events": [
        {
          "t": 0,
          "type": "arrive",
          "pid": 1,
          "ready_queue": [
            0
          ]
        },
        {
          "t": 0,
          "type": "dispatch",
          "pid": 1,
          "ready_queue": []
        },
        {
          "t": 2,
          "type": "arrive",
          "pid": 2,
          "ready_queue": [
            1
          ]
        },
        {
          "t": 4,
          "type": "arrive",
          "pid": 3,
          "ready_queue": [
            1,
            2
          ]
        },
        {
          "t": 5,
          "type": "arrive",
          "pid": 4,
          "ready_queue": [
            1,
            2,
            3
          ]
        },
        {
          "t": 7,
          "type": "complete",
          "pid": 1,
          "ready_queue": [
            1,
            2,
            3
          ]
        },
        {
          "t": 7,
          "type": "dispatch",
          "pid": 3,
          "ready_queue": [
            1,
            3
          ]
        },
        {
          "t": 8,
          "type": "complete",
          "pid": 3,
          "ready_queue": [
            1,
            3
          ]
        },
        {
          "t": 8,
          "type": "dispatch",
          "pid": 2,
          "ready_queue": [
            3
          ]
        },
        {
          "t": 12,
          "type": "complete",
          "pid": 2,
          "ready_queue": [
            3
          ]
        },
        {
          "t": 12,
          "type": "dispatch",
          "pid": 4,
          "ready_queue": []
        },
        {
          "t": 16,
          "type": "complete",
          "pid": 4,
          "ready_queue": []
        }
      ],
      "metrics": {
        "avg_waiting": 4,
        "avg_turnaround": 8,
        "avg_response": 4,
        "cpu_utilization": 100,
        "throughput": 0.25,
        "context_switches": 3
      }
    },
    {
      "version": "1.0",
      "algo": "srtf",
      "quantum": null,
      "context_switch_cost": 0,
      "processes": [
        {
          "pid": 1,
          "arrival": 0,
          "burst": 7,
          "priority": 1,
          "start": 0,
          "completion": 16,
          "waiting": 9,
          "turnaround": 16,
          "response": 0
        },
        {
          "pid": 2,
          "arrival": 2,
          "burst": 4,
          "priority": 1,
          "start": 2,
          "completion": 7,
          "waiting": 1,
          "turnaround": 5,
          "response": 0
        },
        {
          "pid": 3,
          "arrival": 4,
          "burst": 1,
          "priority": 1,
          "start": 4,
          "completion": 5,
          "waiting": 0,
          "turnaround": 1,
          "response": 0
        },
        {
          "pid": 4,
          "arrival": 5,
          "burst": 4,
          "priority": 1,
          "start": 7,
          "completion": 11,
          "waiting": 2,
          "turnaround": 6,
          "response": 2
        }
      ],
      "timeline": [
        {
          "t_start": 0,
          "t_end": 2,
          "pid": 1,
          "type": "run"
        },
        {
          "t_start": 2,
          "t_end": 4,
          "pid": 2,
          "type": "run"
        },
        {
          "t_start": 4,
          "t_end": 5,
          "pid": 3,
          "type": "run"
        },
        {
          "t_start": 5,
          "t_end": 7,
          "pid": 2,
          "type": "run"
        },
        {
          "t_start": 7,
          "t_end": 11,
          "pid": 4,
          "type": "run"
        },
        {
          "t_start": 11,
          "t_end": 16,
          "pid": 1,
          "type": "run"
        }
      ],
      "events": [
        {
          "t": 0,
          "type": "arrive",
          "pid": 1,
          "ready_queue": [
            0
          ]
        },
        {
          "t": 0,
          "type": "dispatch",
          "pid": 1,
          "ready_queue": []
        },
        {
          "t": 2,
          "type": "arrive",
          "pid": 2,
          "ready_queue": [
            1
          ]
        },
        {
          "t": 2,
          "type": "preempt",
          "pid": 1,
          "ready_queue": [
            1,
            0
          ]
        },
        {
          "t": 2,
          "type": "dispatch",
          "pid": 2,
          "ready_queue": [
            0
          ]
        },
        {
          "t": 4,
          "type": "arrive",
          "pid": 3,
          "ready_queue": [
            0,
            2
          ]
        },
        {
          "t": 4,
          "type": "preempt",
          "pid": 2,
          "ready_queue": [
            0,
            2,
            1
          ]
        },
        {
          "t": 4,
          "type": "dispatch",
          "pid": 3,
          "ready_queue": [
            0,
            1
          ]
        },
        {
          "t": 5,
          "type": "complete",
          "pid": 3,
          "ready_queue": [
            0,
            1
          ]
        },
        {
          "t": 5,
          "type": "arrive",
          "pid": 4,
          "ready_queue": [
            0,
            1,
            3
          ]
        },
        {
          "t": 5,
          "type": "dispatch",
          "pid": 2,
          "ready_queue": [
            0,
            3
          ]
        },
        {
          "t": 7,
          "type": "complete",
          "pid": 2,
          "ready_queue": [
            0,
            3
          ]
        },
        {
          "t": 7,
          "type": "dispatch",
          "pid": 4,
          "ready_queue": [
            0
          ]
        },
        {
          "t": 11,
          "type": "complete",
          "pid": 4,
          "ready_queue": [
            0
          ]
        },
        {
          "t": 11,
          "type": "dispatch",
          "pid": 1,
          "ready_queue": []
        },
        {
          "t": 16,
          "type": "complete",
          "pid": 1,
          "ready_queue": []
        }
      ],
      "metrics": {
        "avg_waiting": 3,
        "avg_turnaround": 7,
        "avg_response": 0.5,
        "cpu_utilization": 100,
        "throughput": 0.25,
        "context_switches": 5
      }
    },
    {
      "version": "1.0",
      "algo": "priority",
      "quantum": null,
      "context_switch_cost": 0,
      "processes": [
        {
          "pid": 1,
          "arrival": 0,
          "burst": 7,
          "priority": 1,
          "start": 0,
          "completion": 7,
          "waiting": 0,
          "turnaround": 7,
          "response": 0
        },
        {
          "pid": 2,
          "arrival": 2,
          "burst": 4,
          "priority": 1,
          "start": 7,
          "completion": 11,
          "waiting": 5,
          "turnaround": 9,
          "response": 5
        },
        {
          "pid": 3,
          "arrival": 4,
          "burst": 1,
          "priority": 1,
          "start": 11,
          "completion": 12,
          "waiting": 7,
          "turnaround": 8,
          "response": 7
        },
        {
          "pid": 4,
          "arrival": 5,
          "burst": 4,
          "priority": 1,
          "start": 12,
          "completion": 16,
          "waiting": 7,
          "turnaround": 11,
          "response": 7
        }
      ],
      "timeline": [
        {
          "t_start": 0,
          "t_end": 7,
          "pid": 1,
          "type": "run"
        },
        {
          "t_start": 7,
          "t_end": 11,
          "pid": 2,
          "type": "run"
        },
        {
          "t_start": 11,
          "t_end": 12,
          "pid": 3,
          "type": "run"
        },
        {
          "t_start": 12,
          "t_end": 16,
          "pid": 4,
          "type": "run"
        }
      ],
      "events": [
        {
          "t": 0,
          "type": "arrive",
          "pid": 1,
          "ready_queue": [
            0
          ]
        },
        {
          "t": 0,
          "type": "dispatch",
          "pid": 1,
          "ready_queue": []
        },
        {
          "t": 2,
          "type": "arrive",
          "pid": 2,
          "ready_queue": [
            1
          ]
        },
        {
          "t": 4,
          "type": "arrive",
          "pid": 3,
          "ready_queue": [
            1,
            2
          ]
        },
        {
          "t": 5,
          "type": "arrive",
          "pid": 4,
          "ready_queue": [
            1,
            2,
            3
          ]
        },
        {
          "t": 7,
          "type": "complete",
          "pid": 1,
          "ready_queue": [
            1,
            2,
            3
          ]
        },
        {
          "t": 7,
          "type": "dispatch",
          "pid": 2,
          "ready_queue": [
            2,
            3
          ]
        },
        {
          "t": 11,
          "type": "complete",
          "pid": 2,
          "ready_queue": [
            2,
            3
          ]
        },
        {
          "t": 11,
          "type": "dispatch",
          "pid": 3,
          "ready_queue": [
            3
          ]
        },
        {
          "t": 12,
          "type": "complete",
          "pid": 3,
          "ready_queue": [
            3
          ]
        },
        {
          "t": 12,
          "type": "dispatch",
          "pid": 4,
          "ready_queue": []
        },
        {
          "t": 16,
          "type": "complete",
          "pid": 4,
          "ready_queue": []
        }
      ],
      "metrics": {
        "avg_waiting": 4.75,
        "avg_turnaround": 8.75,
        "avg_response": 4.75,
        "cpu_utilization": 100,
        "throughput": 0.25,
        "context_switches": 3
      }
    },
    {
      "version": "1.0",
      "algo": "priority-p",
      "quantum": null,
      "context_switch_cost": 0,
      "processes": [
        {
          "pid": 1,
          "arrival": 0,
          "burst": 7,
          "priority": 1,
          "start": 0,
          "completion": 7,
          "waiting": 0,
          "turnaround": 7,
          "response": 0
        },
        {
          "pid": 2,
          "arrival": 2,
          "burst": 4,
          "priority": 1,
          "start": 7,
          "completion": 11,
          "waiting": 5,
          "turnaround": 9,
          "response": 5
        },
        {
          "pid": 3,
          "arrival": 4,
          "burst": 1,
          "priority": 1,
          "start": 11,
          "completion": 12,
          "waiting": 7,
          "turnaround": 8,
          "response": 7
        },
        {
          "pid": 4,
          "arrival": 5,
          "burst": 4,
          "priority": 1,
          "start": 12,
          "completion": 16,
          "waiting": 7,
          "turnaround": 11,
          "response": 7
        }
      ],
      "timeline": [
        {
          "t_start": 0,
          "t_end": 7,
          "pid": 1,
          "type": "run"
        },
        {
          "t_start": 7,
          "t_end": 11,
          "pid": 2,
          "type": "run"
        },
        {
          "t_start": 11,
          "t_end": 12,
          "pid": 3,
          "type": "run"
        },
        {
          "t_start": 12,
          "t_end": 16,
          "pid": 4,
          "type": "run"
        }
      ],
      "events": [
        {
          "t": 0,
          "type": "arrive",
          "pid": 1,
          "ready_queue": [
            0
          ]
        },
        {
          "t": 0,
          "type": "dispatch",
          "pid": 1,
          "ready_queue": []
        },
        {
          "t": 2,
          "type": "arrive",
          "pid": 2,
          "ready_queue": [
            1
          ]
        },
        {
          "t": 4,
          "type": "arrive",
          "pid": 3,
          "ready_queue": [
            1,
            2
          ]
        },
        {
          "t": 5,
          "type": "arrive",
          "pid": 4,
          "ready_queue": [
            1,
            2,
            3
          ]
        },
        {
          "t": 7,
          "type": "complete",
          "pid": 1,
          "ready_queue": [
            1,
            2,
            3
          ]
        },
        {
          "t": 7,
          "type": "dispatch",
          "pid": 2,
          "ready_queue": [
            2,
            3
          ]
        },
        {
          "t": 11,
          "type": "complete",
          "pid": 2,
          "ready_queue": [
            2,
            3
          ]
        },
        {
          "t": 11,
          "type": "dispatch",
          "pid": 3,
          "ready_queue": [
            3
          ]
        },
        {
          "t": 12,
          "type": "complete",
          "pid": 3,
          "ready_queue": [
            3
          ]
        },
        {
          "t": 12,
          "type": "dispatch",
          "pid": 4,
          "ready_queue": []
        },
        {
          "t": 16,
          "type": "complete",
          "pid": 4,
          "ready_queue": []
        }
      ],
      "metrics": {
        "avg_waiting": 4.75,
        "avg_turnaround": 8.75,
        "avg_response": 4.75,
        "cpu_utilization": 100,
        "throughput": 0.25,
        "context_switches": 3
      }
    },
    {
      "version": "1.0",
      "algo": "rr",
      "quantum": 2,
      "context_switch_cost": 0,
      "processes": [
        {
          "pid": 1,
          "arrival": 0,
          "burst": 7,
          "priority": 1,
          "start": 0,
          "completion": 16,
          "waiting": 9,
          "turnaround": 16,
          "response": 0
        },
        {
          "pid": 2,
          "arrival": 2,
          "burst": 4,
          "priority": 1,
          "start": 2,
          "completion": 9,
          "waiting": 3,
          "turnaround": 7,
          "response": 0
        },
        {
          "pid": 3,
          "arrival": 4,
          "burst": 1,
          "priority": 1,
          "start": 6,
          "completion": 7,
          "waiting": 2,
          "turnaround": 3,
          "response": 2
        },
        {
          "pid": 4,
          "arrival": 5,
          "burst": 4,
          "priority": 1,
          "start": 9,
          "completion": 15,
          "waiting": 6,
          "turnaround": 10,
          "response": 4
        }
      ],
      "timeline": [
        {
          "t_start": 0,
          "t_end": 2,
          "pid": 1,
          "type": "run"
        },
        {
          "t_start": 2,
          "t_end": 4,
          "pid": 2,
          "type": "run"
        },
        {
          "t_start": 4,
          "t_end": 6,
          "pid": 1,
          "type": "run"
        },
        {
          "t_start": 6,
          "t_end": 7,
          "pid": 3,
          "type": "run"
        },
        {
          "t_start": 7,
          "t_end": 9,
          "pid": 2,
          "type": "run"
        },
        {
          "t_start": 9,
          "t_end": 11,
          "pid": 4,
          "type": "run"
        },
        {
          "t_start": 11,
          "t_end": 13,
          "pid": 1,
          "type": "run"
        },
        {
          "t_start": 13,
          "t_end": 15,
          "pid": 4,
          "type": "run"
        },
        {
          "t_start": 15,
          "t_end": 16,
          "pid": 1,
          "type": "run"
        }
      ],
      "events": [
        {
          "t": 0,
          "type": "arrive",
          "pid": 1,
          "ready_queue": [
            0
          ]
        },
        {
          "t": 0,
          "type": "dispatch",
          "pid": 1,
          "ready_queue": []
        },
        {
          "t": 2,
          "type": "arrive",
          "pid": 2,
          "ready_queue": [
            1
          ]
        },
        {
          "t": 2,
          "type": "preempt",
          "pid": 1,
          "ready_queue": [
            1,
            0
          ]
        },
        {
          "t": 2,
          "type": "dispatch",
          "pid": 2,
          "ready_queue": [
            0
          ]
        },
        {
          "t": 4,
          "type": "arrive",
          "pid": 3,
          "ready_queue": [
            0,
            2
          ]
        },
        {
          "t": 4,
          "type": "preempt",
          "pid": 2,
          "ready_queue": [
            0,
            2,
            1
          ]
        },
        {
          "t": 4,
          "type": "dispatch",
          "pid": 1,
          "ready_queue": [
            2,
            1
          ]
        },
        {
          "t": 5,
          "type": "arrive",
          "pid": 4,
          "ready_queue": [
            2,
            1,
            3
          ]
        },
        {
          "t": 6,
          "type": "preempt",
          "pid": 1,
          "ready_queue": [
            2,
            1,
            3,
            0
          ]
        },
        {
          "t": 6,
          "type": "dispatch",
          "pid": 3,
          "ready_queue": [
            1,
            3,
            0
          ]
        },
        {
          "t": 7,
          "type": "complete",
          "pid": 3,
          "ready_queue": [
            1,
            3,
            0
          ]
        },
        {
          "t": 7,
          "type": "dispatch",
          "pid": 2,
          "ready_queue": [
            3,
            0
          ]
        },
        {
          "t": 9,
          "type": "complete",
          "pid": 2,
          "ready_queue": [
            3,
            0
          ]
        },
        {
          "t": 9,
          "type": "dispatch",
          "pid": 4,
          "ready_queue": [
            0
          ]
        },
        {
          "t": 11,
          "type": "preempt",
          "pid": 4,
          "ready_queue": [
            0,
            3
          ]
        },
        {
          "t": 11,
          "type": "dispatch",
          "pid": 1,
          "ready_queue": [
            3
          ]
        },
        {
          "t": 13,
          "type": "preempt",
          "pid": 1,
          "ready_queue": [
            3,
            0
          ]
        },
        {
          "t": 13,
          "type": "dispatch",
          "pid": 4,
          "ready_queue": [
            0
          ]
        },
        {
          "t": 15,
          "type": "complete",
          "pid": 4,
          "ready_queue": [
            0
          ]
        },
        {
          "t": 15,
          "type": "dispatch",
          "pid": 1,
          "ready_queue": []
        },
        {
          "t": 16,
          "type": "complete",
          "pid": 1,
          "ready_queue": []
        }
      ],
      "metrics": {
        "avg_waiting": 5,
        "avg_turnaround": 9,
        "avg_response": 1.5,
        "cpu_utilization": 100,
        "throughput": 0.25,
        "context_switches": 8
      }
    }
  ]
}}
];
