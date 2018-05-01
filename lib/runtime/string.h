#pragma once

#include <cstdint>

extern "C" {

struct string {
  uint8_t* data;
  uint32_t length;
};

}
