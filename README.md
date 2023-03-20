# Scheduled query manager

Built to deploy new and updated scheduled queries in Big Query.

I built V1 of this when the UI broke and I had to update a bunch of queries through the clunky CLI.

This is V2 - built with CI/CD via gitlab, and soon github.


MUST have a valid keyfile saved as a GitLab Secret for the deploy to work. You can also run it manually from the command line with a key file passed in as an argument. 


