// Real delivery tracking statuses extracted directly from Indecx API statusEvents
export interface IndecxDeliveryTrackingInfo {
  status: "Enviado" | "Entregue" | "Aberto" | "Não entregue" | "Em processamento";
  events: string[];
  lastEventAt: string;
  bounceReason?: string;
}

export const INDECX_REAL_DELIVERY_BY_CONTROL_ID: Record<string, IndecxDeliveryTrackingInfo> = {
  "RVMZGI3J": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-10-29T18:19:49.381Z"
  },
  "7BA5XF5Y": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-28T18:51:48.972Z"
  },
  "XGUBGTRF": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-27T17:02:57.400Z"
  },
  "9NUJJNJN": {
    "status": "Entregue",
    "events": [
      "send",
      "delivered"
    ],
    "lastEventAt": "2026-10-25T07:55:46.443Z"
  },
  "Q2500G6I": {
    "status": "Entregue",
    "events": [
      "send",
      "delivered"
    ],
    "lastEventAt": "2026-10-25T07:16:08.746Z"
  },
  "P5EFSA63": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-24T13:02:25.386Z"
  },
  "SFTTZE4F": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-10-24T12:12:33.801Z"
  },
  "RWC5PFFC": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-10-23T19:08:48.222Z"
  },
  "UCF0Q8DX": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-10-22T15:31:46.730Z"
  },
  "Q9ECQOEV": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-21T20:23:47.476Z"
  },
  "YLE6HWE1": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-10-21T17:02:57.565Z"
  },
  "WT7OLNRF": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-10-21T17:02:40.281Z"
  },
  "Q7WHOD6K": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-20T22:40:45.822Z"
  },
  "24APGMU2": {
    "status": "Não entregue",
    "events": [
      "send",
      "not delivered"
    ],
    "lastEventAt": "2026-10-18T07:54:19.938Z",
    "bounceReason": "permanent (invalid or blocked email)"
  },
  "E2T6C0DO": {
    "status": "Não entregue",
    "events": [
      "send",
      "not delivered"
    ],
    "lastEventAt": "2026-10-18T06:08:44.050Z",
    "bounceReason": "permanent (invalid or blocked email)"
  },
  "EG5OGX3B": {
    "status": "Não entregue",
    "events": [
      "send",
      "DeliveryDelay",
      "not delivered"
    ],
    "lastEventAt": "2026-10-18T20:09:10.516Z",
    "bounceReason": "temporary (undetermined)"
  },
  "6RUETZ76": {
    "status": "Entregue",
    "events": [
      "send",
      "delivered"
    ],
    "lastEventAt": "2026-10-18T06:06:24.937Z"
  },
  "KJI9M1FL": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-17T19:17:02.002Z"
  },
  "GGKLZ212": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-17T16:20:06.302Z"
  },
  "48XZMBLU": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-10-17T16:04:39.703Z"
  },
  "0NAJNW23": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-17T14:25:52.977Z"
  },
  "21I5AFD2": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-16T13:13:01.182Z"
  },
  "YPE7OUMQ": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-14T21:05:12.321Z"
  },
  "J8ITV60P": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-14T21:01:58.107Z"
  },
  "KAI6TBE1": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-14T18:39:15.409Z"
  },
  "X4UYQ3QB": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-10-14T13:01:35.081Z"
  },
  "72O6Z0MG": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-10-14T12:27:40.156Z"
  },
  "4SRQPQY7": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-10-13T20:13:26.499Z"
  },
  "815T9YHT": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-13T18:27:23.725Z"
  },
  "ZZW8L5X7": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-10T19:11:04.248Z"
  },
  "6LNWO4UU": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-10T19:02:26.229Z"
  },
  "S296ZL5F": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-10T14:49:45.522Z"
  },
  "0BO0X4UT": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-10T13:38:30.855Z"
  },
  "R9P0W2GV": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-09T13:02:22.777Z"
  },
  "KUYVV4XH": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-10-08T23:03:00.323Z"
  },
  "Y3742TWQ": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-10-08T19:46:53.284Z"
  },
  "Q06PDNRA": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-07T16:15:22.032Z"
  },
  "P1H4ZZSW": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-07T12:08:18.539Z"
  },
  "TE7TEGZT": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-06T21:43:32.603Z"
  },
  "7V66GQQK": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-05T22:51:15.233Z"
  },
  "UMPJGVDI": {
    "status": "Enviado",
    "events": [],
    "lastEventAt": "2026-10-05T18:10:17.533Z"
  },
  "Q0DLEQ9N": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-05T12:40:37.819Z"
  },
  "3BSZ0SUW": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-04T18:39:33.074Z"
  },
  "Y62KJNZR": {
    "status": "Entregue",
    "events": [
      "send",
      "delivered",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-18T15:29:10.536Z"
  },
  "AYDYPRY7": {
    "status": "Entregue",
    "events": [
      "send",
      "delivered",
      "send"
    ],
    "lastEventAt": "2026-10-11T15:59:52.958Z"
  },
  "6VTO92TT": {
    "status": "Não entregue",
    "events": [
      "send",
      "DeliveryDelay",
      "not delivered",
      "send"
    ],
    "lastEventAt": "2026-10-12T05:22:11.972Z",
    "bounceReason": "temporary (mailbox full or unavailable)"
  },
  "DP9LAAWB": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-03T20:43:36.120Z"
  },
  "QFWT3E0U": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-10-03T19:42:00.347Z"
  },
  "M7HFZ8O2": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-03T18:32:29.905Z"
  },
  "BGS3TEMH": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-10-03T13:48:25.884Z"
  },
  "B6VPBJWU": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-03T13:02:02.550Z"
  },
  "3Q52JGPV": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-02T17:02:04.323Z"
  },
  "8RIF78G6": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-02T17:01:59.226Z"
  },
  "6I8IG5X9": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-10-02T17:01:52.145Z"
  },
  "K9VT9LJ9": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-09-30T20:15:38.442Z"
  },
  "VO8QFZU6": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-30T19:39:45.602Z"
  },
  "IP7H7WBA": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-30T18:09:34.968Z"
  },
  "8CB8XYY9": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-30T18:06:29.958Z"
  },
  "9D7EJGLE": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-09-30T17:05:15.437Z"
  },
  "KJ94BVCV": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-28T21:48:12.142Z"
  },
  "0419G6CL": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-28T18:40:23.502Z"
  },
  "ZI3LY7T5": {
    "status": "Não entregue",
    "events": [
      "send",
      "not delivered",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-11T15:59:25.131Z",
    "bounceReason": "permanent (invalid or blocked email)"
  },
  "UD3LGN9B": {
    "status": "Não entregue",
    "events": [
      "send",
      "DeliveryDelay",
      "not delivered",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-11T15:59:25.147Z",
    "bounceReason": "temporary (undetermined)"
  },
  "Y3AXW9KY": {
    "status": "Entregue",
    "events": [
      "send",
      "delivered",
      "send",
      "DeliveryDelay",
      "not delivered",
      "send"
    ],
    "lastEventAt": "2026-10-11T15:59:24.461Z",
    "bounceReason": "Transient (MailboxFull)"
  },
  "ZJ6RIFIG": {
    "status": "Enviado",
    "events": [],
    "lastEventAt": "2026-09-27T02:21:42.664Z"
  },
  "6RXJIO20": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-26T19:33:53.403Z"
  },
  "J7NOPOQO": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-26T18:32:42.189Z"
  },
  "FXQK7XVZ": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-26T17:43:35.454Z"
  },
  "22TF51ZL": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-09-26T13:49:33.198Z"
  },
  "69HREI3K": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-09-25T09:52:43.757Z"
  },
  "9WNS2QKJ": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-24T16:04:53.580Z"
  },
  "965LB9VK": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-09-23T17:07:20.989Z"
  },
  "NI6GDNTX": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-23T13:03:42.123Z"
  },
  "92JJGUR2": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-23T01:34:56.236Z"
  },
  "DIK6N80L": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-09-21T22:37:14.878Z"
  },
  "O25GXCDD": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-21T12:32:17.030Z"
  },
  "Z2FOHXXC": {
    "status": "Entregue",
    "events": [
      "send",
      "delivered",
      "send",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-11T15:59:09.856Z"
  },
  "TE2JE5Q6": {
    "status": "Aberto",
    "events": [
      "send",
      "delivered",
      "click"
    ],
    "lastEventAt": "2026-09-21T12:34:12.847Z"
  },
  "E1JRAL6U": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-09-19T20:47:03.158Z"
  },
  "9R5AQZGQ": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-09-19T19:11:56.977Z"
  },
  "8PI5EMQ1": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-09-19T18:49:20.470Z"
  },
  "LQWH9VKQ": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-19T13:40:56.682Z"
  },
  "27PNFJ8M": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-18T12:42:34.011Z"
  },
  "UDUZIUMS": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-18T12:27:34.911Z"
  },
  "S0KKWDGZ": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-17T22:11:38.189Z"
  },
  "S2DF0FYL": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-16T18:36:00.404Z"
  },
  "RQ1BBUUP": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-16T18:28:47.741Z"
  },
  "I9YKB63C": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-16T17:06:10.299Z"
  },
  "4ODPYD4H": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-16T17:02:35.767Z"
  },
  "APNK34YC": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-15T20:04:36.985Z"
  },
  "VVELH2VZ": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-15T18:08:42.210Z"
  },
  "T3Z4AQCI": {
    "status": "Aberto",
    "events": [
      "send",
      "delivered",
      "open",
      "send",
      "delivered",
      "send",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-11T15:58:46.434Z"
  },
  "XFRC8WAN": {
    "status": "Não entregue",
    "events": [
      "send",
      "not delivered",
      "send",
      "not delivered",
      "send",
      "send",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-18T15:12:32.710Z",
    "bounceReason": "Permanent (OnAccountSuppressionList)"
  },
  "NAN7LFET": {
    "status": "Entregue",
    "events": [
      "send",
      "delivered",
      "send",
      "delivered",
      "send",
      "send",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-18T15:12:31.580Z"
  },
  "CMAAR38I": {
    "status": "Não entregue",
    "events": [
      "send",
      "not delivered",
      "send",
      "not delivered",
      "send",
      "send",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-18T15:12:31.147Z",
    "bounceReason": "Permanent (OnAccountSuppressionList)"
  },
  "1F46JELQ": {
    "status": "Não entregue",
    "events": [
      "send",
      "not delivered",
      "send",
      "not delivered",
      "send",
      "send",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-18T15:12:27.950Z",
    "bounceReason": "Permanent (OnAccountSuppressionList)"
  },
  "RMDBY5FB": {
    "status": "Entregue",
    "events": [
      "send",
      "delivered",
      "send",
      "delivered",
      "send",
      "send",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-18T15:12:28.102Z"
  },
  "08N239AO": {
    "status": "Entregue",
    "events": [
      "send",
      "delivered",
      "send",
      "delivered",
      "send",
      "send",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-18T15:12:41.241Z"
  },
  "OR0BJNEQ": {
    "status": "Entregue",
    "events": [
      "send",
      "delivered",
      "send",
      "delivered",
      "send",
      "send",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-18T15:12:39.601Z"
  },
  "PB8GBVUE": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-12T20:32:08.802Z"
  },
  "4WA0WNO4": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-09-12T19:04:23.652Z"
  },
  "8GHX8GNR": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-12T12:02:52.673Z"
  },
  "86FX73XV": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-11T21:03:17.496Z"
  },
  "0ZV7FY0S": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-10T22:40:40.045Z"
  },
  "BQ3GLPGG": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-09-10T20:29:54.496Z"
  },
  "PV5CQ6O1": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-10T17:16:48.460Z"
  },
  "ZEIU1TAJ": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-10T14:12:00.617Z"
  },
  "MQVTW4P1": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-09-09T17:02:12.273Z"
  },
  "PJ0O7HEC": {
    "status": "Entregue",
    "events": [],
    "lastEventAt": "2026-09-09T17:01:26.826Z"
  },
  "KRXTQI1S": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-09T12:50:27.708Z"
  },
  "XLC9GW4P": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-09T12:20:38.084Z"
  },
  "QL3XS0VD": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-08T21:07:50.721Z"
  },
  "WVQCC5ZB": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-08T20:22:35.491Z"
  },
  "5SD1OBL7": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-08T19:06:11.367Z"
  },
  "LU026N1K": {
    "status": "Aberto",
    "events": [
      "click"
    ],
    "lastEventAt": "2026-09-07T13:05:16.421Z"
  },
  "3ICJXTDQ": {
    "status": "Aberto",
    "events": [
      "send",
      "delivered",
      "send",
      "delivered",
      "send",
      "open",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-11T15:58:35.875Z"
  },
  "RQSOU037": {
    "status": "Entregue",
    "events": [
      "send",
      "delivered",
      "send",
      "delivered",
      "send",
      "send",
      "send",
      "not delivered"
    ],
    "lastEventAt": "2026-10-11T15:58:35.784Z",
    "bounceReason": "permanent (undetermined)"
  },
  "T8TKV4UJ": {
    "status": "Entregue",
    "events": [
      "send",
      "delivered",
      "send",
      "delivered",
      "send",
      "delivered",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-11T15:58:34.739Z"
  },
  "ENKTXQ66": {
    "status": "Entregue",
    "events": [
      "send",
      "delivered",
      "send",
      "delivered",
      "send",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-11T15:58:16.602Z"
  },
  "PHDNSS5E": {
    "status": "Entregue",
    "events": [
      "send",
      "delivered",
      "send",
      "delivered",
      "send",
      "send",
      "send"
    ],
    "lastEventAt": "2026-10-11T15:58:16.453Z"
  }
};
