import axios from 'axios'

export const axiosJson = axios.create({
  headers: {
    Accepts: 'application/json',
  },
})

